/**
 * invoice-parser.js
 * Server-side service that parses supplier invoices from multiple formats:
 *  - Excel (.xlsx, .csv)   → uses xlsx package (already installed)
 *  - CFDI/SAT XML          → uses xml2js (v3.3 and v4.0 namespaces)
 *  - PDF                   → uses pdf-parse to extract text, feeds into receipt-parser
 *  - Image / camera        → uses Ollama llava vision model (graceful fallback)
 */

const XLSX = require("xlsx");
const xml2js = require("xml2js");
const pdfParse = require("pdf-parse");
const http = require("http");
const { parseReceipt } = require("./receipt-parser");

// ---------------------------------------------------------------------------
// Excel / CSV
// ---------------------------------------------------------------------------

/**
 * Parse an Excel or CSV buffer into invoice line items.
 * Accepted column names (case-insensitive, first row = header):
 *   NoIdentificacion | barcode | sku | codigo
 *   Descripcion | description | nombre | name
 *   Cantidad | quantity | qty | piezas
 *   ValorUnitario | unitcost | costo | price | precio
 *   Importe | total | subtotal | monto
 * @param {Buffer} buffer
 * @returns {{ items: Array, totals: {subtotal,tax,total}, invoiceNumber:string|null, invoiceDate:string|null }}
 */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // Normalise header names → canonical keys
  const colMap = (header) => {
    const h = String(header).toLowerCase().trim().replace(/\s+/g, "");
    if (/noidentificaci|barcode|sku|codigo/.test(h)) return "noIdentificacion";
    if (/descripci|description|nombre|name/.test(h)) return "description";
    if (/cantidad|quantity|qty|piezas/.test(h)) return "quantity";
    if (/valorunitario|unitcost|costo|price|precio/.test(h)) return "unitCost";
    if (/importe|total|subtotal|monto/.test(h)) return "total";
    if (/iva|tax|impuesto/.test(h)) return "tax";
    if (/invoice|folio|factura/.test(h)) return "invoiceNumber";
    if (/fecha|date/.test(h)) return "invoiceDate";
    return null;
  };

  // Build per-row canonical objects
  const items = [];
  let invoiceNumber = null;
  let invoiceDate = null;
  let totalsTax = 0;
  let totalsSubtotal = 0;

  for (const row of rows) {
    const canonical = {};
    for (const [key, value] of Object.entries(row)) {
      const mapped = colMap(key);
      if (mapped) canonical[mapped] = value;
    }

    // Row-level invoice metadata
    if (canonical.invoiceNumber && !invoiceNumber)
      invoiceNumber = String(canonical.invoiceNumber);
    if (canonical.invoiceDate && !invoiceDate)
      invoiceDate = String(canonical.invoiceDate);

    // Skip rows without a description
    if (!canonical.description) continue;

    const quantity = parseFloat(canonical.quantity) || 1;
    const unitCost = parseFloat(canonical.unitCost) || 0;
    const total =
      parseFloat(canonical.total) ||
      Math.round(quantity * unitCost * 100) / 100;

    totalsSubtotal += total;
    if (canonical.tax) totalsTax += parseFloat(canonical.tax) || 0;

    items.push({
      description: String(canonical.description).trim(),
      noIdentificacion: canonical.noIdentificacion
        ? String(canonical.noIdentificacion).trim()
        : null,
      barcode: canonical.noIdentificacion
        ? String(canonical.noIdentificacion).trim()
        : null,
      quantity,
      unitCost,
      total,
      included: true,
    });
  }

  return {
    items,
    totals: {
      subtotal: Math.round(totalsSubtotal * 100) / 100,
      tax: Math.round(totalsTax * 100) / 100,
      total: Math.round((totalsSubtotal + totalsTax) * 100) / 100,
    },
    invoiceNumber,
    invoiceDate,
    providerRfc: null,
    providerName: null,
  };
}

// ---------------------------------------------------------------------------
// CFDI / SAT XML  (v3.3 and v4.0)
// ---------------------------------------------------------------------------

/**
 * Parse a CFDI XML string (Mexican fiscal invoice).
 * Supports cfdi namespace (v3.3: xmlns:cfdi=..., v4.0: same namespace).
 * @param {string} xmlString
 * @returns {Promise<{ items, totals, invoiceNumber, invoiceDate, providerRfc, providerName }>}
 */
async function parseCFDI(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: true });
  const result = await parser.parseStringPromise(xmlString);

  // CFDI root element may be cfdi:Comprobante or just Comprobante
  const root =
    result["cfdi:Comprobante"] ||
    result["Comprobante"] ||
    Object.values(result)[0];

  if (!root) throw new Error("Not a valid CFDI XML document");

  const attr = root.$ || {};

  // Invoice metadata
  const invoiceNumber =
    attr.Folio || attr.Serie
      ? `${attr.Serie || ""}${attr.Folio || ""}`.trim()
      : null;
  const invoiceDate = attr.Fecha ? attr.Fecha.split("T")[0] : null;

  // Emisor (issuer = provider)
  const emisorArr = root["cfdi:Emisor"] || root["Emisor"] || [];
  const emisorAttr = (emisorArr[0] || {}).$ || {};
  const providerRfc = emisorAttr.Rfc || emisorAttr.RFC || null;
  const providerName = emisorAttr.Nombre || null;

  // Conceptos (line items)
  const conceptosArr = root["cfdi:Conceptos"] || root["Conceptos"] || [];
  const conceptoList =
    (conceptosArr[0] || {})["cfdi:Concepto"] ||
    (conceptosArr[0] || {})["Concepto"] ||
    [];

  const items = conceptoList.map((c) => {
    const a = c.$ || {};
    const quantity = parseFloat(a.Cantidad) || 1;
    const unitCost = parseFloat(a.ValorUnitario) || 0;
    const total =
      parseFloat(a.Importe) || Math.round(quantity * unitCost * 100) / 100;
    return {
      description: (a.Descripcion || a.Description || "").trim(),
      noIdentificacion: a.NoIdentificacion || null,
      barcode: a.NoIdentificacion || null,
      quantity,
      unitCost,
      total,
      included: true,
    };
  });

  // Totals from Comprobante attributes
  const subtotal = parseFloat(attr.SubTotal) || 0;
  const totalAmt = parseFloat(attr.Total) || 0;
  const tax = Math.round((totalAmt - subtotal) * 100) / 100;

  return {
    items,
    totals: { subtotal, tax, total: totalAmt },
    invoiceNumber,
    invoiceDate,
    providerRfc,
    providerName,
  };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Extract text from a PDF buffer using pdf-parse, then feed to receipt-parser.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ items, totals, invoiceNumber, invoiceDate, providerRfc, providerName }>}
 */
async function parsePDF(pdfBuffer) {
  let text = "";
  try {
    const data = await pdfParse(pdfBuffer);
    text = data.text || "";
  } catch (err) {
    console.warn("[invoice-parser] pdf-parse error:", err.message);
  }

  if (!text.trim()) {
    // Scanned PDF with no text layer — caller should try vision instead
    return {
      items: [],
      totals: { subtotal: 0, tax: 0, total: 0 },
      invoiceNumber: null,
      invoiceDate: null,
      providerRfc: null,
      providerName: null,
      requiresVision: true,
    };
  }

  const parsed = parseReceipt(text);
  const items = (parsed.items || []).map((it) => ({
    description: it.name,
    noIdentificacion: null,
    barcode: null,
    quantity: it.quantity || 1,
    unitCost: it.price || 0,
    total: Math.round((it.quantity || 1) * (it.price || 0) * 100) / 100,
    included: true,
  }));

  return {
    items,
    totals: {
      subtotal: parsed.total || 0,
      tax: 0,
      total: parsed.total || 0,
    },
    invoiceNumber: null,
    invoiceDate: parsed.date || null,
    providerRfc: null,
    providerName: parsed.provider || null,
    requiresVision: false,
  };
}

// ---------------------------------------------------------------------------
// Ollama Vision (llava model)
// ---------------------------------------------------------------------------

const OLLAMA_HOST = process.env.OLLAMA_HOST || "localhost";
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || "11434", 10);
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llava";
const VISION_TIMEOUT_MS = 60000; // 60s — vision calls can be slow

const VISION_PROMPT = `You are an invoice data extractor. Look at this supplier invoice image and return ONLY a JSON object (no markdown, no explanation) in this exact shape:
{
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "providerName": "string or null",
  "items": [
    { "description": "string", "noIdentificacion": "barcode/sku or null", "quantity": number, "unitCost": number, "total": number }
  ],
  "totals": { "subtotal": number, "tax": number, "total": number }
}
If a value is not visible, use null or 0. Only return the JSON object.`;

/**
 * Send an image to Ollama llava model for invoice data extraction.
 * Falls back gracefully when llava is unavailable.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType  e.g. "image/jpeg"
 * @returns {Promise<{ items, totals, invoiceNumber, invoiceDate, providerRfc, providerName, visionUnavailable? }>}
 */
async function parseWithOllamaVision(imageBuffer, mimeType) {
  const base64Image = imageBuffer.toString("base64");

  const payload = JSON.stringify({
    model: VISION_MODEL,
    prompt: VISION_PROMPT,
    images: [base64Image],
    stream: false,
  });

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: VISION_TIMEOUT_MS,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const ollamaResp = JSON.parse(body);
            const responseText = ollamaResp.response || "";
            // Strip markdown code fences if present
            const jsonStr = responseText.replace(/```json?\n?|```/g, "").trim();
            const extracted = JSON.parse(jsonStr);

            const items = (extracted.items || []).map((it) => ({
              description: String(it.description || "").trim(),
              noIdentificacion: it.noIdentificacion || null,
              barcode: it.noIdentificacion || null,
              quantity: parseFloat(it.quantity) || 1,
              unitCost: parseFloat(it.unitCost) || 0,
              total: parseFloat(it.total) || 0,
              included: true,
            }));

            resolve({
              items,
              totals: {
                subtotal: parseFloat((extracted.totals || {}).subtotal) || 0,
                tax: parseFloat((extracted.totals || {}).tax) || 0,
                total: parseFloat((extracted.totals || {}).total) || 0,
              },
              invoiceNumber: extracted.invoiceNumber || null,
              invoiceDate: extracted.invoiceDate || null,
              providerRfc: null,
              providerName: extracted.providerName || null,
            });
          } catch (parseErr) {
            console.warn(
              "[invoice-parser] Ollama response parse error:",
              parseErr.message
            );
            resolve(_visionUnavailable());
          }
        });
      }
    );

    req.on("error", (err) => {
      console.warn("[invoice-parser] Ollama not reachable:", err.message);
      resolve(_visionUnavailable());
    });

    req.on("timeout", () => {
      req.destroy();
      console.warn("[invoice-parser] Ollama vision timeout");
      resolve(_visionUnavailable());
    });

    req.write(payload);
    req.end();
  });
}

function _visionUnavailable() {
  return {
    items: [],
    totals: { subtotal: 0, tax: 0, total: 0 },
    invoiceNumber: null,
    invoiceDate: null,
    providerRfc: null,
    providerName: null,
    visionUnavailable: true,
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher — choose parser by MIME type
// ---------------------------------------------------------------------------

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} [originalName]
 * @returns {Promise<ParsedInvoice>}
 */
async function parseInvoiceBuffer(buffer, mimeType, originalName) {
  const mime = (mimeType || "").toLowerCase();
  const ext = (originalName || "").split(".").pop().toLowerCase();

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    mime === "text/csv" ||
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv"
  ) {
    return parseExcel(buffer);
  }

  if (mime === "text/xml" || mime === "application/xml" || ext === "xml") {
    return parseCFDI(buffer.toString("utf8"));
  }

  if (mime === "application/pdf" || ext === "pdf") {
    const result = await parsePDF(buffer);
    if (result.requiresVision) {
      // Scanned PDF — no text layer — try vision
      return parseWithOllamaVision(buffer, mime);
    }
    return result;
  }

  // Image / camera
  if (
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(ext)
  ) {
    return parseWithOllamaVision(buffer, mime);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

module.exports = {
  parseInvoiceBuffer,
  parseExcel,
  parseCFDI,
  parsePDF,
  parseWithOllamaVision,
};
