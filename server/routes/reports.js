const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Register = require("../models/Register");
const { protect, checkPermission } = require("../middleware/auth");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

// @route   GET /api/reports/sales
// @desc    Generate sales report
// @access  Private (requires reports permission)
router.get(
  "/sales",
  protect,
  checkPermission(["reports"]),
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        groupBy = "day",
        includeRefunds = "false",
      } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Start and end dates are required" });
      }

      const query = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        },
        status: "completed",
      };

      if (includeRefunds === "false") {
        query.refundedSale = { $exists: false };
      }

      const sales = await Sale.find(query)
        .populate("cashier", "firstName lastName username")
        .populate("register", "name location")
        .sort({ createdAt: 1 });

      // Group sales data
      const groupedData = {};
      sales.forEach((sale) => {
        const date = new Date(sale.createdAt);
        let key;

        if (groupBy === "day") {
          key = date.toISOString().split("T")[0];
        } else if (groupBy === "week") {
          const weekNum = getWeekNumber(date);
          key = `${date.getFullYear()}-W${weekNum}`;
        } else if (groupBy === "month") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            count: 0,
            total: 0,
            subtotal: 0,
            tax: 0,
            discount: 0,
            sales: [],
          };
        }

        groupedData[key].count++;
        groupedData[key].total += sale.total;
        groupedData[key].subtotal += sale.subtotal;
        groupedData[key].tax += sale.tax || 0;
        groupedData[key].discount += sale.discount || 0;
        groupedData[key].sales.push(sale);
      });

      // Generate PDF
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales-report-${startDate}-to-${endDate}.pdf`
      );
      doc.pipe(res);

      // Header
      doc.fontSize(20).text("Sales Report", { align: "center" });
      doc
        .fontSize(12)
        .text(`Period: ${startDate} to ${endDate}`, { align: "center" });
      doc.moveDown();

      // Summary
      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const totalSales = sales.length;
      const avgTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

      doc.fontSize(14).text("Summary", { underline: true });
      doc.fontSize(10);
      doc.text(`Total Sales: ${totalSales}`);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
      doc.text(`Average Transaction: $${avgTransaction.toFixed(2)}`);
      doc.moveDown();

      // Grouped data
      doc.fontSize(14).text(`Sales by ${groupBy}`, { underline: true });
      doc.fontSize(10);

      Object.keys(groupedData)
        .sort()
        .forEach((key) => {
          const data = groupedData[key];
          doc.moveDown(0.5);
          doc.text(`${key}: ${data.count} sales - $${data.total.toFixed(2)}`);
        });

      doc.moveDown();

      // Payment methods
      const paymentMethods = {};
      sales.forEach((sale) => {
        paymentMethods[sale.paymentMethod] =
          (paymentMethods[sale.paymentMethod] || 0) + 1;
      });

      doc.fontSize(14).text("Payment Methods", { underline: true });
      doc.fontSize(10);
      Object.entries(paymentMethods).forEach(([method, count]) => {
        const percentage = ((count / totalSales) * 100).toFixed(1);
        doc.text(`${method}: ${count} (${percentage}%)`);
      });

      doc.end();
    } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/reports/stock
// @desc    Generate stock report
// @access  Private (requires reports permission)
router.get(
  "/stock",
  protect,
  checkPermission(["reports"]),
  async (req, res) => {
    try {
      const { type = "current", category = "" } = req.query;

      let query = { active: true };
      if (category) {
        query.category = category;
      }

      // Filter based on report type
      if (type === "low") {
        query.stock = { $lte: 10, $gt: 0 };
      } else if (type === "out") {
        query.stock = { $lte: 0 };
      }

      const products = await Product.find(query).sort({ category: 1, name: 1 });

      if (products.length === 0) {
        return res
          .status(404)
          .json({ message: "No products found for the selected criteria" });
      }

      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Stock Report");

      // Header
      worksheet.columns = [
        { header: "SKU", key: "sku", width: 15 },
        { header: "Barcode", key: "barcode", width: 15 },
        { header: "Product Name", key: "name", width: 30 },
        { header: "Category", key: "category", width: 15 },
        { header: "Stock", key: "stock", width: 10 },
        { header: "Price", key: "price", width: 12 },
        { header: "Stock Value", key: "stockValue", width: 15 },
      ];

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF654483" },
      };
      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

      // Add data
      let totalStockValue = 0;
      products.forEach((product) => {
        const stockValue = product.price * product.stock;
        totalStockValue += stockValue;

        worksheet.addRow({
          sku: product.sku || "",
          barcode: product.barcode || "",
          name: product.name,
          category: product.category || "",
          stock: product.stock,
          price: product.price,
          stockValue: stockValue,
        });
      });

      // Add summary row
      worksheet.addRow([]);
      const summaryRow = worksheet.addRow([
        "TOTAL",
        "",
        "",
        "",
        products.reduce((sum, p) => sum + p.stock, 0),
        "",
        totalStockValue,
      ]);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEEEEE" },
      };

      // Format currency columns
      worksheet.getColumn("price").numFmt = "$#,##0.00";
      worksheet.getColumn("stockValue").numFmt = "$#,##0.00";

      // Send file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=stock-report-${type}-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating stock report:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/reports/cashflow
// @desc    Generate cashflow report
// @access  Private (requires reports permission)
router.get(
  "/cashflow",
  protect,
  checkPermission(["reports"]),
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        includeWithdrawals = "true",
        groupByRegister = "false",
        groupByPayment = "false",
      } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Start and end dates are required" });
      }

      const query = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        },
        status: "completed",
      };

      const sales = await Sale.find(query)
        .populate("cashier", "firstName lastName username")
        .populate("register", "name location")
        .sort({ createdAt: 1 });

      // Generate PDF
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=cashflow-report-${startDate}-to-${endDate}.pdf`
      );
      doc.pipe(res);

      // Header
      doc.fontSize(20).text("Cash Flow Report", { align: "center" });
      doc
        .fontSize(12)
        .text(`Period: ${startDate} to ${endDate}`, { align: "center" });
      doc.moveDown();

      // Summary
      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const cashSales = sales.filter((s) => s.paymentMethod === "cash");
      const totalCash = cashSales.reduce((sum, s) => sum + s.total, 0);

      doc.fontSize(14).text("Overall Summary", { underline: true });
      doc.fontSize(10);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
      doc.text(`Cash Sales: $${totalCash.toFixed(2)}`);
      doc.text(`Total Transactions: ${sales.length}`);
      doc.moveDown();

      // Group by payment method
      if (groupByPayment === "true") {
        const paymentGroups = {};
        sales.forEach((sale) => {
          if (!paymentGroups[sale.paymentMethod]) {
            paymentGroups[sale.paymentMethod] = { count: 0, total: 0 };
          }
          paymentGroups[sale.paymentMethod].count++;
          paymentGroups[sale.paymentMethod].total += sale.total;
        });

        doc.fontSize(14).text("By Payment Method", { underline: true });
        doc.fontSize(10);
        Object.entries(paymentGroups).forEach(([method, data]) => {
          doc.text(
            `${method}: ${data.count} transactions - $${data.total.toFixed(2)}`
          );
        });
        doc.moveDown();
      }

      // Group by register
      if (groupByRegister === "true") {
        const registerGroups = {};
        sales.forEach((sale) => {
          const regName = sale.register?.name || "Unknown";
          if (!registerGroups[regName]) {
            registerGroups[regName] = { count: 0, total: 0 };
          }
          registerGroups[regName].count++;
          registerGroups[regName].total += sale.total;
        });

        doc.fontSize(14).text("By Register", { underline: true });
        doc.fontSize(10);
        Object.entries(registerGroups).forEach(([register, data]) => {
          doc.text(
            `${register}: ${data.count} transactions - $${data.total.toFixed(2)}`
          );
        });
        doc.moveDown();
      }

      // Daily breakdown
      const dailyData = {};
      sales.forEach((sale) => {
        const date = new Date(sale.createdAt).toISOString().split("T")[0];
        if (!dailyData[date]) {
          dailyData[date] = { count: 0, total: 0 };
        }
        dailyData[date].count++;
        dailyData[date].total += sale.total;
      });

      doc.fontSize(14).text("Daily Breakdown", { underline: true });
      doc.fontSize(10);
      Object.keys(dailyData)
        .sort()
        .forEach((date) => {
          const data = dailyData[date];
          doc.text(`${date}: ${data.count} sales - $${data.total.toFixed(2)}`);
        });

      doc.end();
    } catch (error) {
      console.error("Error generating cashflow report:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/reports/barcodes
// @desc    Generate barcode PDF
// @access  Private (requires reports permission)
router.get(
  "/barcodes",
  protect,
  checkPermission(["reports"]),
  async (req, res) => {
    try {
      const {
        generationType = "category",
        category = "",
        barcodeType = "ean13",
        labelSize = "medium",
        includePrice = "true",
        includeName = "true",
      } = req.query;

      let query = { active: true };

      if (generationType === "category") {
        if (category) {
          query.category = category;
        }
        query.barcode = { $exists: true, $ne: "" };
      } else if (generationType === "auto") {
        // Auto-generate for products without barcodes
        query.barcode = { $in: ["", null] };
      }

      const products = await Product.find(query).sort({ category: 1, name: 1 });

      if (products.length === 0) {
        return res
          .status(404)
          .json({ message: "No products found for barcode generation" });
      }

      // Label dimensions in points (1 inch = 72 points)
      const labelSizes = {
        small: { width: 113, height: 57 }, // 40x20mm
        medium: { width: 170, height: 85 }, // 60x30mm
        large: { width: 227, height: 113 }, // 80x40mm
      };

      const size = labelSizes[labelSize] || labelSizes.medium;

      // Generate PDF with barcode labels
      const doc = new PDFDocument({
        size: [size.width, size.height],
        margin: 5,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=barcodes-${generationType}-${Date.now()}.pdf`
      );
      doc.pipe(res);

      products.forEach((product, index) => {
        if (index > 0) {
          doc.addPage();
        }

        const barcode = product.barcode || `AUTO${product.sku || product._id}`;

        // Center content
        let yPos = 10;

        // Product name
        if (includeName === "true") {
          doc.fontSize(
            labelSize === "small" ? 8 : labelSize === "medium" ? 10 : 12
          );
          doc.text(product.name.substring(0, 30), 5, yPos, {
            width: size.width - 10,
            align: "center",
          });
          yPos += labelSize === "small" ? 15 : labelSize === "medium" ? 20 : 25;
        }

        // Barcode (represented as text for now - in production use barcode library)
        doc.fontSize(
          labelSize === "small" ? 10 : labelSize === "medium" ? 14 : 16
        );
        doc.font("Courier");
        doc.text(barcode, 5, yPos, {
          width: size.width - 10,
          align: "center",
        });
        yPos += labelSize === "small" ? 15 : labelSize === "medium" ? 20 : 25;

        // Price
        if (includePrice === "true") {
          doc.font("Helvetica-Bold");
          doc.fontSize(
            labelSize === "small" ? 10 : labelSize === "medium" ? 14 : 16
          );
          doc.text(`$${product.price.toFixed(2)}`, 5, yPos, {
            width: size.width - 10,
            align: "center",
          });
        }
      });

      doc.end();
    } catch (error) {
      console.error("Error generating barcode PDF:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/reports/qrcodes
// @desc    Generate QR code PDF for products with barcode_standard
// @access  Private (requires reports permission)
router.get(
  "/qrcodes",
  protect,
  checkPermission(["reports"]),
  async (req, res) => {
    try {
      const {
        category = "",
        barcodeStandardFilter = "yes",
        labelSize = "medium",
        multiplePerPage = "false",
        includePrice = "true",
        includeName = "true",
      } = req.query;

      // Query products based on barcode_standard filter
      let query = {};

      // Apply barcode standard filter
      if (barcodeStandardFilter === "yes") {
        // Has barcode standard (not empty, not "NO")
        query.barcode_standard = { $exists: true, $ne: "", $nin: ["NO", "no"] };
      } else if (barcodeStandardFilter === "no") {
        // Has barcode standard set to "NO"
        query.barcode_standard = { $in: ["NO", "no"] };
      } else if (barcodeStandardFilter === "empty") {
        // Has barcode standard field but it's empty
        query.barcode_standard = "";
      } else if (barcodeStandardFilter === "missing") {
        // Doesn't have barcode_standard field at all
        query.barcode_standard = { $exists: false };
      }

      if (category) {
        query.category = category;
      }

      const products = await Product.find(query).sort({ category: 1, name: 1 });

      if (products.length === 0) {
        return res
          .status(404)
          .json({ message: "No products found for the selected criteria" });
      }

      const QRCode = require("qrcode");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=qrcodes-${category || "all"}-${Date.now()}.pdf`
      );

      if (multiplePerPage === "true") {
        // Multiple QR codes per A4 page in a grid
        const doc = new PDFDocument({
          size: "A4",
          margin: 30,
        });
        doc.pipe(res);

        // A4 dimensions: 595.28 x 841.89 points
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 10;
        const availableWidth = pageWidth - 2 * margin;
        const availableHeight = pageHeight - 2 * margin;

        // Helper function to add page number footer
        let currentPageNumber = 1;
        const addPageFooter = () => {
          doc.fontSize(8);
          doc.text(
            `Page ${currentPageNumber}`,
            margin,
            pageHeight - margin - 10,
            {
              width: availableWidth,
              align: "center",
            }
          );
        };

        // Grid configuration (5 columns x 6 rows = 30 QR codes per page)
        const cols = 5;
        const rows = 6;
        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / rows;

        // QR code size (smaller to fit with text)
        const qrSize = 70;
        const fontSize = 6;
        const priceSize = 7;

        let currentRow = 0;
        let currentCol = 0;

        for (let index = 0; index < products.length; index++) {
          const product = products[index];

          // Create QR code data
          const qrData =
            product.ean13 ||
            product.ean ||
            product.upc ||
            product.sku ||
            product._id.toString();

          // Calculate position
          const x = margin + currentCol * cellWidth;
          const y = margin + currentRow * cellHeight;
          const centerX = x + cellWidth / 2;

          let yPos = y;

          // Product name
          if (includeName === "true") {
            doc.fontSize(fontSize);
            doc.font("Helvetica-Bold");
            const maxNameWidth = cellWidth - 10;
            const productName = product.name.substring(0, 30);
            doc.text(productName, x + 5, yPos, {
              width: maxNameWidth,
              align: "center",
            });
            yPos += 15;
          }

          // Generate and place QR code
          const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: qrSize,
            margin: 0,
            errorCorrectionLevel: "M",
          });

          const qrX = centerX - qrSize / 2;
          doc.image(qrCodeDataUrl, qrX, yPos, {
            width: qrSize,
            height: qrSize,
          });
          yPos += qrSize + 3;

          // Barcode standard (smaller)
          doc.fontSize(5);
          doc.font("Helvetica");
          doc.text(`${product.ean || product.ean13 || "N/A"}`, x + 5, yPos, {
            width: cellWidth - 10,
            align: "center",
          });
          yPos += 8;

          // Price
          if (includePrice === "true") {
            doc.font("Helvetica-Bold");
            doc.fontSize(priceSize);
            doc.text(`$${product.price.toFixed(2)}`, x + 5, yPos, {
              width: cellWidth - 10,
              align: "center",
            });
          }

          // Move to next position
          currentCol++;
          if (currentCol >= cols) {
            currentCol = 0;
            currentRow++;
          }

          // New page if needed
          if (currentRow >= rows && index < products.length - 1) {
            currentPageNumber++;
            doc.addPage();
            currentRow = 0;
            currentCol = 0;
          }
        }

        // Add footer to last page
        doc.end();
      } else {
        // Original: One QR code per label page
        const labelSizes = {
          small: { width: 113, height: 113 }, // 40x40mm (square)
          medium: { width: 170, height: 170 }, // 60x60mm (square)
          large: { width: 227, height: 227 }, // 80x80mm (square)
        };

        const size = labelSizes[labelSize] || labelSizes.medium;

        const doc = new PDFDocument({
          size: [size.width, size.height],
          margin: 5,
        });
        doc.pipe(res);

        let pageNumber = 1;
        const totalPages = products.length;

        for (let index = 0; index < products.length; index++) {
          const product = products[index];

          if (index > 0) {
            doc.addPage();
          }

          // Create QR code data - use the barcode field or product ID
          const qrData =
            product.ean13 ||
            product.ean ||
            product.upc ||
            product.sku ||
            product._id.toString();

          let yPos = 5;

          // Product name at top
          if (includeName === "true") {
            doc.fontSize(
              labelSize === "small" ? 7 : labelSize === "medium" ? 9 : 11
            );
            doc.font("Helvetica-Bold");
            const nameLines = doc.heightOfString(product.name, {
              width: size.width - 10,
              align: "center",
            });
            doc.text(product.name.substring(0, 40), 5, yPos, {
              width: size.width - 10,
              align: "center",
            });
            yPos += Math.min(nameLines + 5, 25);
          }

          // Generate QR code as data URL
          const qrSize =
            labelSize === "small" ? 80 : labelSize === "medium" ? 130 : 170;
          const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: qrSize,
            margin: 1,
            errorCorrectionLevel: "M",
          });

          // Calculate center position for QR code
          const qrX = (size.width - qrSize) / 2;
          doc.image(qrCodeDataUrl, qrX, yPos, {
            width: qrSize,
            height: qrSize,
          });
          yPos += qrSize + 5;

          // Barcode standard label
          doc.fontSize(
            labelSize === "small" ? 6 : labelSize === "medium" ? 8 : 10
          );
          doc.font("Helvetica");
          doc.text(`Standard: ${product.barcode_standard}`, 5, yPos, {
            width: size.width - 10,
            align: "center",
          });
          yPos += 10;

          // Price at bottom
          if (includePrice === "true") {
            doc.font("Helvetica-Bold");
            doc.fontSize(
              labelSize === "small" ? 9 : labelSize === "medium" ? 12 : 14
            );
            doc.text(`$${product.price.toFixed(2)}`, 5, yPos, {
              width: size.width - 10,
              align: "center",
            });
            yPos += 15;
          }

          pageNumber++;
        }

        doc.end();
      }
    } catch (error) {
      console.error("Error generating QR code PDF:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = router;
