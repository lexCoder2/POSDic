/**
 * Receipt text parser service.
 *
 * Extracts: provider name, items (name, quantity, price), total, date
 * from OCR-scanned provider receipt plain text.
 */

/**
 * Try to extract a date from receipt text.
 * Supports formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
 * @param {string} text
 * @returns {string|null}
 */
function extractDate(text) {
  const patterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{2}\/\d{2}\/\d{4})\b/,
    /\b(\d{2}-\d{2}-\d{4})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Try to extract a total amount from receipt text.
 * Looks for lines like "TOTAL: $8.50" or "TOTAL $8.50"
 * @param {string} text
 * @returns {number|null}
 */
function extractTotal(text) {
  const m = text.match(/total[:\s]+\$?\s*([\d,]+\.?\d*)/i);
  if (m) return parseFloat(m[1].replace(",", ""));
  return null;
}

/**
 * Try to extract the provider/vendor name from the first non-empty lines.
 * @param {string[]} lines
 * @returns {string}
 */
function extractProvider(lines) {
  const skipPatterns = /^-+$|invoice|ref:|date:|total|subtotal|tax|^\s*$/i;
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed.length > 2 && !skipPatterns.test(trimmed)) {
      return trimmed;
    }
  }
  return "Unknown Provider";
}

/**
 * Parse item lines from receipt.
 * Matches patterns like:
 *   "Product Name x3   $4.50"
 *   "Product Name 3    4.50"
 *   "Product Name      $4.50"
 * @param {string[]} lines
 * @returns {Array<{name:string, quantity:number, price:number|null}>}
 */
function extractItems(lines) {
  const items = [];
  // Pattern: name, optional: "xN" or "N units", optional price
  const itemPattern = /^(.+?)\s+x(\d+)\s+\$?([\d.]+)/i;
  const simplePattern = /^(.+?)\s{2,}\$?([\d.]+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^-+$/.test(trimmed)) continue;
    if (/^(total|subtotal|tax|iva|ref:|invoice|date:)/i.test(trimmed)) continue;

    const m1 = trimmed.match(itemPattern);
    if (m1) {
      items.push({
        name: m1[1].trim(),
        quantity: parseInt(m1[2], 10),
        price: parseFloat(m1[3]),
      });
      continue;
    }

    const m2 = trimmed.match(simplePattern);
    if (m2) {
      const price = parseFloat(m2[2]);
      if (!isNaN(price) && price > 0) {
        items.push({
          name: m2[1].trim(),
          quantity: 1,
          price,
        });
      }
    }
  }

  return items;
}

/**
 * Main parse function.
 * @param {string} text - Raw OCR text from receipt
 * @returns {{ provider: string, items: Array, total: number|null, date: string|null }}
 */
function parseReceipt(text) {
  const lines = text.split(/\r?\n/);
  return {
    provider: extractProvider(lines),
    items: extractItems(lines),
    total: extractTotal(text),
    date: extractDate(text),
  };
}

module.exports = {
  parseReceipt,
  extractProvider,
  extractItems,
  extractTotal,
  extractDate,
};
