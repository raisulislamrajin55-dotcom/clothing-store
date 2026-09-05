const express = require("express");
const router = express.Router();
const db = require("../services/fileDb");

// GET /api/products — list all products (public)
router.get("/", (req, res) => {
  const products = db.getProducts();
  res.json({ success: true, products });
});

// GET /api/products/:id — single product
router.get("/:id", (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }
  res.json({ success: true, product });
});

module.exports = router;
