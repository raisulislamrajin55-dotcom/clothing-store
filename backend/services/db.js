const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "[db] MONGODB_URI not set — the app will not start correctly without a database. See README for MongoDB Atlas setup."
    );
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  await seedProductsIfEmpty();
}

async function seedProductsIfEmpty() {
  const count = await Product.countDocuments();
  if (count > 0) return;

  const seedPath = path.join(__dirname, "..", "data", "products.json");
  if (!fs.existsSync(seedPath)) return;

  const seedProducts = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  if (Array.isArray(seedProducts) && seedProducts.length > 0) {
    await Product.insertMany(seedProducts);
    console.log(`[db] Seeded ${seedProducts.length} starter products into MongoDB.`);
  }
}

module.exports = { connectDb };