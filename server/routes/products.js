const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { protect, checkPermission } = require("../middleware/auth");
const multer = require("multer");
const xlsx = require("xlsx");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel and CSV files are allowed."));
    }
  },
});

// @route   GET /api/products/categories
// @desc    Get distinct categories from products
// @access  Private
router.get("/categories", protect, async (req, res) => {
  try {
    // Get distinct categories from products collection
    const categories = await Product.distinct("category");

    // Filter out null/empty and format as category objects
    const formattedCategories = categories
      .filter((cat) => cat && cat.trim() !== "")
      .map((cat, index) => ({
        _id: cat,
        name: cat,
        active: true,
        icon: "fas fa-tag", // Default icon
        order: index,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(formattedCategories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products/favorites
// @desc    Get favorite products based on sales volume
// @access  Private
router.get("/favorites", protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Aggregate sales to find most sold products
    const topProducts = await Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
          totalSales: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);

    // Get product IDs
    const productIds = topProducts.map((p) => p._id);

    // Fetch full product details
    const products = await Product.find({
      _id: { $in: productIds },
      available: true,
    }).populate("provider", "name code");

    // Sort products by sales volume
    const sortedProducts = products.sort((a, b) => {
      const aIndex = productIds.findIndex((id) => id.equals(a._id));
      const bIndex = productIds.findIndex((id) => id.equals(b._id));
      return aIndex - bIndex;
    });

    res.json(sortedProducts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Helper function for fuzzy search - calculate Levenshtein distance
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Helper function to calculate fuzzy match score
function fuzzyScore(searchTerm, targetText) {
  if (!targetText) return 0;

  const search = searchTerm.toLowerCase().trim();
  const target = targetText.toLowerCase().trim();

  // Exact match - highest score
  if (target === search) return 100;

  // Starts with search term - very high priority
  if (target.startsWith(search)) return 98;

  // Contains exact phrase - high score
  if (target.includes(search)) return 95;

  // Check if all search words are contained in order
  const searchWords = search.split(/\s+/).filter((w) => w.length > 0);
  const targetWords = target.split(/\s+/);

  // All words appear in order
  let searchIndex = 0;
  for (const targetWord of targetWords) {
    if (
      searchIndex < searchWords.length &&
      targetWord.includes(searchWords[searchIndex])
    ) {
      searchIndex++;
    }
  }
  if (searchIndex === searchWords.length) return 90;

  // Check if all search words are contained (any order)
  const allWordsMatch = searchWords.every((word) => target.includes(word));
  if (allWordsMatch) return 85;

  // Check if target words start with search words
  let startsWithCount = 0;
  for (const searchWord of searchWords) {
    for (const targetWord of targetWords) {
      if (targetWord.startsWith(searchWord) && searchWord.length >= 2) {
        startsWithCount++;
        break;
      }
    }
  }
  if (startsWithCount === searchWords.length) return 80;

  // Fuzzy match using Levenshtein distance
  let bestScore = 0;

  for (const word of targetWords) {
    for (const searchWord of searchWords) {
      // Skip very short words for fuzzy matching
      if (searchWord.length < 3) continue;

      const distance = levenshteinDistance(searchWord, word);
      const maxLen = Math.max(searchWord.length, word.length);
      const similarity = ((maxLen - distance) / maxLen) * 100;

      // Dynamic distance threshold based on word length
      const maxDistance = Math.max(1, Math.floor(searchWord.length * 0.3));

      if (distance <= maxDistance && similarity > bestScore) {
        bestScore = similarity;
      }
    }
  }

  return bestScore;
}

// @route   GET /api/products/search
// @desc    Fuzzy search products with typo tolerance
// @access  Private
router.get("/search", protect, async (req, res) => {
  try {
    const { q, category, limit = 50 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    let query = {};
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    // Get ALL products from database (no limit on initial query)
    const allProducts = await Product.find(query).populate(
      "provider",
      "name code"
    );

    // Score each product based on fuzzy match
    const scoredProducts = allProducts
      .map((product) => {
        const nameScore = fuzzyScore(q, product.name);
        const brandScore = fuzzyScore(q, product.brand) * 0.9; // Slightly lower weight
        const storeScore = fuzzyScore(q, product.store) * 0.7; // Lower weight
        const categoryScore = fuzzyScore(q, product.category) * 0.6; // Lower weight

        // Check exact matches on codes (highest priority)
        let codeScore = 0;
        const searchLower = q.toLowerCase().trim();
        if (product.ean && product.ean.toLowerCase() === searchLower)
          codeScore = 100;
        else if (product.ean && product.ean.toLowerCase().includes(searchLower))
          codeScore = 98;

        if (product.ean13 && product.ean13.toLowerCase() === searchLower)
          codeScore = 100;
        else if (
          product.ean13 &&
          product.ean13.toLowerCase().includes(searchLower)
        )
          codeScore = 98;

        if (product.upc && product.upc.toLowerCase() === searchLower)
          codeScore = 100;
        else if (product.upc && product.upc.toLowerCase().includes(searchLower))
          codeScore = 98;

        if (product.sku && product.sku.toLowerCase() === searchLower)
          codeScore = 100;
        else if (product.sku && product.sku.toLowerCase().includes(searchLower))
          codeScore = 98;

        if (
          product.product_id &&
          product.product_id.toLowerCase() === searchLower
        )
          codeScore = 100;
        else if (
          product.product_id &&
          product.product_id.toLowerCase().includes(searchLower)
        )
          codeScore = 98;

        const maxScore = Math.max(
          nameScore,
          brandScore,
          storeScore,
          categoryScore,
          codeScore
        );

        return {
          product,
          score: maxScore,
        };
      })
      .filter((item) => item.score > 60) // Balanced threshold for better coverage
      .sort((a, b) => {
        // Sort by score, then by name length (shorter names first for exact matches)
        if (b.score === a.score) {
          return a.product.name.length - b.product.name.length;
        }
        return b.score - a.score;
      })
      .slice(0, parseInt(limit))
      .map((item) => item.product);

    res.json(scoredProducts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products
// @desc    Get all products
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { category, search, available, brand, store, page, pageSize } =
      req.query;
    let query = {};

    if (category) query.category = { $regex: category, $options: "i" };
    if (available !== undefined) query.available = available === "true";
    if (brand) query.brand = { $regex: brand, $options: "i" };
    if (store) query.store = { $regex: store, $options: "i" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { product_id: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { ean: { $regex: search, $options: "i" } },
        { ean13: { $regex: search, $options: "i" } },
        { upc: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await Product.countDocuments(query);

    // Pagination
    const currentPage = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 100;
    const skip = (currentPage - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const products = await Product.find(query)
      .populate("provider", "name code")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: products,
      pagination: {
        total,
        page: currentPage,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products/barcode/:barcode
// @desc    Get product by barcode (supports ean, ean13, upc)
// @access  Private
router.get("/barcode/:barcode", protect, async (req, res) => {
  try {
    const barcode = req.params.barcode;
    const product = await Product.findOne({
      $or: [
        { ean: barcode },
        { ean13: barcode },
        { upc: barcode },
        { multi_ean: barcode },
      ],
      available: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "provider",
      "name code email phone"
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (requires inventory permission)
router.post("/", protect, checkPermission("inventory"), async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name color")
      .populate("provider", "name");

    res.status(201).json(populatedProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Product code or barcode already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (requires inventory permission)
router.put("/:id", protect, checkPermission("inventory"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    )
      .populate("category", "name color")
      .populate("provider", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (requires inventory permission)
router.delete(
  "/:id",
  protect,
  checkPermission("inventory"),
  async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   POST /api/products/bulk-import
// @desc    Bulk import products from Excel/CSV
// @access  Private (requires inventory permission)
router.post(
  "/bulk-import",
  protect,
  checkPermission("inventory"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel/CSV file
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "File is empty or invalid" });
      }

      const results = {
        successful: 0,
        failed: 0,
        errors: [],
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header row

        try {
          // Validate required fields
          if (!row.name || !row.barcode || !row.category || !row.price) {
            results.failed++;
            results.errors.push(
              `Row ${rowNumber}: Missing required fields (name, barcode, category, or price)`
            );
            continue;
          }

          // Check if product with barcode already exists
          const existingProduct = await Product.findOne({
            $or: [
              { ean: row.barcode },
              { ean13: row.barcode },
              { upc: row.barcode },
            ],
          });

          if (existingProduct) {
            // Update existing product
            existingProduct.name = row.name;
            if (row.brand) existingProduct.brand = row.brand;
            existingProduct.category = row.category;
            existingProduct.price = parseFloat(row.price);
            if (row.cost) existingProduct.cost = parseFloat(row.cost);
            existingProduct.stock = parseInt(row.stock) || 0;
            if (row.minStock) existingProduct.minStock = parseInt(row.minStock);
            if (row.image) existingProduct.image_url = row.image;
            if (row.active !== undefined)
              existingProduct.active =
                row.active === "true" || row.active === true;
            existingProduct.updatedAt = Date.now();
            await existingProduct.save();
          } else {
            // Create new product
            const newProduct = new Product({
              name: row.name,
              ean: row.barcode,
              ean13: row.barcode,
              brand: row.brand || "",
              category: row.category,
              price: parseFloat(row.price),
              cost: parseFloat(row.cost) || 0,
              stock: parseInt(row.stock) || 0,
              minStock: parseInt(row.minStock) || 0,
              image_url: row.image || "",
              active: row.active === "true" || row.active === true || true,
              product_id: row.barcode,
            });
            await newProduct.save();
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: ${error.message}`);
        }
      }

      res.json({
        message: "Import completed",
        successful: results.successful,
        failed: results.failed,
        errors: results.errors,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error processing file",
        error: error.message,
      });
    }
  }
);

module.exports = router;
