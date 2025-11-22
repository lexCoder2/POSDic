require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb://admin:productdb2025@localhost:27017/products?authSource=admin";

async function fetchProducts() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log("\n=== AVAILABLE COLLECTIONS ===");
    collections.forEach((col) => console.log(`- ${col.name}`));

    // Check each collection for data
    console.log("\n=== COLLECTION DATA COUNTS ===");
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`${col.name}: ${count} documents`);

      if (count > 0) {
        const sample = await db.collection(col.name).findOne({});
        console.log(`\nSample from ${col.name}:`);
        console.log(JSON.stringify(sample, null, 2));
        console.log(`\nFields: ${Object.keys(sample).join(", ")}\n`);
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fetchProducts();
