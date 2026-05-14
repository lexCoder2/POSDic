const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const { classifyWithHeuristic } = require("../services/categorizer");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const OLLAMA_TIMEOUT_MS = 5000;

/**
 * Try to classify a product using Ollama.
 * Returns null when Ollama is unavailable or times out.
 */
async function classifyWithOllama(name, brand, type) {
  try {
    const prompt = `Classify this grocery/retail product into a single category name (e.g. Dairy, Bakery, Beverages, Meat, Produce, Snacks, Cleaning, Personal Care, Frozen, Grain & Cereals, Condiments & Spices, or General).
Product name: ${name}
Brand: ${brand || "unknown"}
Type/description: ${type || ""}
Reply with ONLY the category name, nothing else.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const category = (data.response || "").trim().split("\n")[0].trim();
    if (!category) return null;

    return { category, confidence: 0.85, source: "ollama" };
  } catch {
    return null;
  }
}

// POST /api/ai/categorize
router.post(
  "/categorize",
  protect,
  checkPermission(["inventory"]),
  async (req, res) => {
    const { name, brand, type } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    // Try Ollama first
    const ollamaResult = await classifyWithOllama(name, brand, type);
    if (ollamaResult) {
      return res.json(ollamaResult);
    }

    // Fallback to heuristic
    const { category, confidence } = classifyWithHeuristic(name, brand, type);
    return res.json({ category, confidence, source: "heuristic" });
  }
);

// POST /api/ai/categorize/batch
router.post(
  "/categorize/batch",
  protect,
  checkPermission(["inventory"]),
  async (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "products array is required" });
    }

    const results = await Promise.all(
      products.map(async (p) => {
        const { name = "", brand = "", type = "" } = p;
        const ollamaResult = await classifyWithOllama(name, brand, type);
        if (ollamaResult) {
          return { name, ...ollamaResult };
        }
        const { category, confidence } = classifyWithHeuristic(
          name,
          brand,
          type
        );
        return { name, category, confidence, source: "heuristic" };
      })
    );

    return res.json({ results });
  }
);

module.exports = router;
