const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

function formatProduct(p) {
  const obj = p.toObject ? p.toObject() : p;
  return { ...obj, id: obj._id.toString() };
}

// GET /api/products — list all products (public)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: 1 });
    res.json({ success: true, products: products.map(formatProduct) });
  } catch (err) {
    console.error("[products] Failed to fetch products:", err);
    res.status(500).json({ success: false, message: "Failed to load products." });
  }
});

// GET /api/products/:id — single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, product: formatProduct(product) });
  } catch (err) {
    console.error("[products] Failed to fetch product:", err);
    res.status(500).json({ success: false, message: "Failed to load product." });
  }
});

module.exports = router;