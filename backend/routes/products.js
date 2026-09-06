const express = require("express");
const router = express.Router();
const db = require("../services/fileDb");

// GET /api/products — list all products (public)
router.get("/", async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error("[products] Failed to fetch products:", err);
    res.status(500).json({ success: false, message: "Failed to load products." });
  }
});

// GET /api/products/:id — single product
router.get("/:id", async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error("[products] Failed to fetch product:", err);
    res.status(500).json({ success: false, message: "Failed to load product." });
  }
});

module.exports = router;