require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/database");
const User = require("./models/User");
const Category = require("./models/Category");
const Product = require("./models/Product");
const Provider = require("./models/Provider");
const PrintTemplate = require("./models/PrintTemplate");

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    await connectDB();

    // Check existing data (do NOT clear)
    console.log("Checking existing data...");
    const existingUsers = await User.countDocuments();
    const existingCategories = await Category.countDocuments();
    const existingProducts = await Product.countDocuments();
    const existingProviders = await Provider.countDocuments();
    const existingTemplates = await PrintTemplate.countDocuments();

    console.log(`Found ${existingProducts} existing products in database`);
    console.log(`Found ${existingCategories} existing categories`);
    console.log(`Found ${existingProviders} existing providers`);
    console.log(`Found ${existingUsers} existing users`);
    console.log(`Found ${existingTemplates} existing templates`);

    // Create Users (only if they don't exist)
    console.log("\nCreating users (if needed)...");
    const users = await User.create([
      {
        username: "admin",
        email: "admin@pos.com",
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        permissions: [
          "sales",
          "refunds",
          "discounts",
          "reports",
          "inventory",
          "users",
          "settings",
        ],
      },
      {
        username: "manager",
        email: "manager@pos.com",
        password: "manager123",
        firstName: "Manager",
        lastName: "User",
        role: "manager",
        permissions: ["sales", "refunds", "discounts", "reports", "inventory"],
      },
      {
        username: "cashier",
        email: "cashier@pos.com",
        password: "cashier123",
        firstName: "Cashier",
        lastName: "User",
        role: "cashier",
        permissions: ["sales", "discounts"],
      },
    ]);
    console.log(`✅ Created ${users.length} users`);

    // Get or Create Categories
    console.log("\nGetting or creating categories...");
    let categories = await Category.find();

    if (categories.length === 0) {
      categories = await Category.create([
        {
          name: "Electronics",
          description: "Electronic devices and accessories",
          color: "#2196f3",
          order: 1,
        },
        {
          name: "Groceries",
          description: "Food and beverages",
          color: "#4caf50",
          order: 2,
        },
        {
          name: "Clothing",
          description: "Apparel and accessories",
          color: "#ff9800",
          order: 3,
        },
        {
          name: "Home & Garden",
          description: "Home improvement and gardening",
          color: "#9c27b0",
          order: 4,
        },
        {
          name: "Health & Beauty",
          description: "Health and beauty products",
          color: "#e91e63",
          order: 5,
        },
        {
          name: "Sports",
          description: "Sports and outdoor equipment",
          color: "#00bcd4",
          order: 6,
        },
      ]);
      console.log(`✅ Created ${categories.length} new categories`);
    } else {
      console.log(`✅ Using ${categories.length} existing categories`);
    }

    // Get or Create Providers
    console.log("\nGetting or creating providers...");
    let providers = await Provider.find();

    if (providers.length === 0) {
      providers = await Provider.create([
        {
          code: "PROV001",
          name: "Tech Supplies Co.",
          email: "contact@techsupplies.com",
          phone: "+1234567890",
          paymentTerms: "30days",
        },
        {
          code: "PROV002",
          name: "Fresh Foods Distributor",
          email: "orders@freshfoods.com",
          phone: "+1234567891",
          paymentTerms: "15days",
        },
        {
          code: "PROV003",
          name: "Fashion Wholesale",
          email: "info@fashionwholesale.com",
          phone: "+1234567892",
          paymentTerms: "30days",
        },
      ]);
      console.log(`✅ Created ${providers.length} new providers`);
    } else {
      console.log(`✅ Using ${providers.length} existing providers`);
    }

    // Create sample products ONLY if no products exist
    console.log("\nChecking products...");
    const productCount = await Product.countDocuments();

    if (productCount === 0) {
      console.log("No products found. Creating sample products...");
      const products = await Product.create([
        // Electronics
        {
          code: "ELEC001",
          barcode: "1234567890123",
          name: "Wireless Mouse",
          description: "Ergonomic wireless mouse",
          category: categories[0]._id,
          price: 29.99,
          cost: 15.0,
          stock: 50,
          minStock: 10,
          unit: "unit",
          taxRate: 10,
          provider: providers[0]._id,
        },
        {
          code: "ELEC002",
          barcode: "1234567890124",
          name: "USB Cable",
          description: "USB-C charging cable",
          category: categories[0]._id,
          price: 9.99,
          cost: 3.0,
          stock: 100,
          minStock: 20,
          unit: "unit",
          taxRate: 10,
          provider: providers[0]._id,
        },
        // Groceries
        {
          code: "GROC001",
          barcode: "2234567890123",
          name: "Organic Apples",
          description: "Fresh organic apples",
          category: categories[1]._id,
          price: 4.99,
          cost: 2.5,
          stock: 25,
          minStock: 5,
          unit: "kg",
          requiresScale: true,
          taxRate: 5,
          provider: providers[1]._id,
        },
        {
          code: "GROC002",
          barcode: "2234567890124",
          name: "Fresh Bread",
          description: "Whole wheat bread",
          category: categories[1]._id,
          price: 3.49,
          cost: 1.5,
          stock: 30,
          minStock: 10,
          unit: "unit",
          taxRate: 5,
          provider: providers[1]._id,
        },
        // Clothing
        {
          code: "CLOT001",
          barcode: "3234567890123",
          name: "T-Shirt - Blue",
          description: "Cotton blue t-shirt",
          category: categories[2]._id,
          price: 19.99,
          cost: 8.0,
          stock: 40,
          minStock: 10,
          unit: "unit",
          taxRate: 10,
          provider: providers[2]._id,
        },
        {
          code: "CLOT002",
          barcode: "3234567890124",
          name: "Jeans",
          description: "Classic blue jeans",
          category: categories[2]._id,
          price: 49.99,
          cost: 20.0,
          stock: 25,
          minStock: 5,
          unit: "unit",
          taxRate: 10,
          provider: providers[2]._id,
        },
      ]);
      console.log(`✅ Created ${products.length} sample products`);
    } else {
      console.log(
        `✅ Database already has ${productCount} products - skipping product creation`
      );
    }

    // Create default print template if none exists
    console.log("\nChecking print templates...");
    const templateExists = await PrintTemplate.findOne({ isDefault: true });

    if (!templateExists) {
      console.log("Creating default print template...");
      const template = await PrintTemplate.create({
        name: "Default Receipt",
        description: "Standard receipt template",
        templateType: "receipt",
        paperSize: "80mm",
        header: {
          showLogo: false,
          storeName: "Retail POS Store",
          storeAddress: "123 Main Street, City, Country",
          storePhone: "+1234567890",
          storeEmail: "info@retailpos.com",
          taxId: "TAX123456",
          customText: "Thank you for shopping with us!",
        },
        body: {
          showProductCode: true,
          showBarcode: false,
          showQuantity: true,
          showUnitPrice: true,
          showDiscount: true,
          showTax: true,
          showSubtotal: true,
          fontSize: "medium",
        },
        footer: {
          showTotals: true,
          showPaymentMethod: true,
          showCashier: true,
          showDateTime: true,
          showBarcode: false,
          customMessage: "Please keep this receipt for returns",
          showThankYou: true,
        },
        styles: {
          fontFamily: "Arial",
          primaryColor: "#333333",
          textAlign: "center",
        },
        isDefault: true,
        active: true,
      });
      console.log("✅ Created default print template");
    } else {
      console.log("✅ Default print template already exists");
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Final Database Status:");
    console.log(`   Products: ${await Product.countDocuments()}`);
    console.log(`   Categories: ${await Category.countDocuments()}`);
    console.log(`   Providers: ${await Provider.countDocuments()}`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Templates: ${await PrintTemplate.countDocuments()}`);
    console.log("\n📝 Login Credentials:");
    console.log("Admin: admin / admin123");
    console.log("Manager: manager / manager123");
    console.log("Cashier: cashier / cashier123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
