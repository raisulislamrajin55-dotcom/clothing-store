const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const sheets = require("../services/googleSheets");

const ADMIN_SECRET_TOKEN = process.env.JWT_SECRET || "secret_admin_token_123";

const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    if (token === ADMIN_SECRET_TOKEN) {
      return next();
    }
    res.status(401).json({ success: false, message: "Invalid token" });
  } catch (err) {
    res.status(401).json({ success: false, message: "Authentication error" });
  }
};

function formatProduct(p) {
  const obj = p.toObject ? p.toObject() : p;
  return { ...obj, id: obj._id.toString() };
}

// --- AUTH ---
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (username === adminUser && password === adminPass) {
      return res.json({ success: true, token: ADMIN_SECRET_TOKEN });
    }
    res.status(401).json({ success: false, message: "Invalid username or password" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

router.use(adminAuth);

// --- ORDERS ---
router.get("/orders", async (req, res) => {
  try {
    const { q, status } = req.query;
    let filter = {};
    if (status && status !== "All") filter.status = status;
    if (q) {
      filter.$or = [
        { orderId: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

router.patch("/orders/:orderId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update order status" });
  }
});

// --- PRODUCTS ---
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products: products.map(formatProduct) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { name, price, image, sizes, description, category } = req.body;
    if (!name || !price || !image || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({ success: false, message: "Name, price, image, and at least one size are required." });
    }
    const newProduct = await Product.create({
      name,
      price: Number(price),
      image,
      sizes,
      description: description || "",
      category: category || "General",
      inStock: true,
    });
    res.status(201).json({ success: true, product: formatProduct(newProduct) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create product" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    if (updates.price !== undefined) updates.price = Number(updates.price);
    const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: formatProduct(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update product" });
  }
});

router.patch("/products/:id/stock", async (req, res) => {
  try {
    const { inStock } = req.body;
    const updated = await Product.findByIdAndUpdate(req.params.id, { inStock: Boolean(inStock) }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: formatProduct(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update stock" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

module.exports = router;