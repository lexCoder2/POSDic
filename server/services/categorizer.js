/**
 * Heuristic-based product categorization.
 * Used as fallback when Ollama is unavailable.
 */

const KEYWORD_RULES = [
  {
    category: "Dairy",
    keywords: [
      "milk",
      "cheese",
      "yogurt",
      "cream",
      "butter",
      "lacto",
      "lacteo",
      "leche",
      "queso",
      "mantequilla",
      "crema",
      "yogur",
    ],
  },
  {
    category: "Bakery",
    keywords: [
      "bread",
      "bun",
      "roll",
      "toast",
      "pan",
      "bimbo",
      "tortilla",
      "bagel",
      "croissant",
      "muffin",
      "cake",
      "galleta",
      "cookie",
    ],
  },
  {
    category: "Beverages",
    keywords: [
      "juice",
      "water",
      "soda",
      "cola",
      "coffee",
      "tea",
      "agua",
      "jugo",
      "refresco",
      "bebida",
      "drink",
      "cerveza",
      "beer",
      "wine",
      "vino",
      "sprite",
      "pepsi",
      "coca",
    ],
  },
  {
    category: "Meat",
    keywords: [
      "beef",
      "chicken",
      "pork",
      "turkey",
      "sausage",
      "ham",
      "carne",
      "pollo",
      "cerdo",
      "jamon",
      "salchicha",
      "bacon",
      "fish",
      "salmon",
      "tuna",
      "atun",
      "pescado",
    ],
  },
  {
    category: "Produce",
    keywords: [
      "apple",
      "banana",
      "orange",
      "grape",
      "manzana",
      "naranja",
      "platano",
      "uva",
      "fresa",
      "strawberry",
      "lettuce",
      "lechuga",
      "tomato",
      "tomate",
      "onion",
      "cebolla",
      "vegetable",
      "vegetal",
      "fruit",
      "fruta",
    ],
  },
  {
    category: "Grain & Cereals",
    keywords: [
      "rice",
      "pasta",
      "arroz",
      "cereal",
      "oat",
      "avena",
      "flour",
      "harina",
      "wheat",
      "trigo",
      "noodle",
      "fideos",
    ],
  },
  {
    category: "Condiments & Spices",
    keywords: [
      "salt",
      "sal",
      "pepper",
      "pimienta",
      "sauce",
      "salsa",
      "mayo",
      "ketchup",
      "mustard",
      "mostaza",
      "vinegar",
      "vinagre",
      "oil",
      "aceite",
      "spice",
      "especias",
    ],
  },
  {
    category: "Snacks",
    keywords: [
      "chip",
      "papas",
      "crisp",
      "pretzel",
      "popcorn",
      "palomitas",
      "candy",
      "dulce",
      "chocolate",
      "gummy",
      "goma",
      "snack",
      "botana",
    ],
  },
  {
    category: "Frozen",
    keywords: ["frozen", "ice cream", "helado", "congelado", "pizza"],
  },
  {
    category: "Cleaning",
    keywords: [
      "detergent",
      "detergente",
      "soap",
      "jabon",
      "shampoo",
      "cleaner",
      "limpiador",
      "bleach",
      "cloro",
      "toilet",
      "papel",
    ],
  },
  {
    category: "Personal Care",
    keywords: [
      "toothpaste",
      "pasta dental",
      "deodorant",
      "desodorante",
      "lotion",
      "crema",
      "shampoo",
      "razors",
      "rastrillo",
    ],
  },
];

/**
 * Classify a product using keyword matching.
 * @param {string} name
 * @param {string} [brand]
 * @param {string} [type]
 * @returns {{ category: string, confidence: number }}
 */
function classifyWithHeuristic(name = "", brand = "", type = "") {
  const text = `${name} ${brand} ${type}`.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        return { category: rule.category, confidence: 0.6 };
      }
    }
  }

  return { category: "General", confidence: 0.1 };
}

module.exports = { classifyWithHeuristic };
