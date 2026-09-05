const express = require("express");
const router = express.Router();
const db = require("../services/fileDb");
const sheets = require("../services/googleSheets");
const { createToken, requireAdmin } = require("../middleware/adminAuth");

const VALID_STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

// POST /api/admin/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = createToken(username);
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: "Invalid username or password." });
});

// Everything below requires a valid admin session
router.use(requireAdmin);

// GET /api/admin/orders — list all orders (with optional search/filter via query params)
router.get("/orders", (req, res) => {
  let orders = db.getOrders();
  const { status, q } = req.query;

  if (status && status !== "All") {
    orders = orders.filter((o) => o.status === status);
  }

  if (q) {
    const term = q.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.phone.includes(term) ||
        o.productName.toLowerCase().includes(term)
    );
  }

  orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, orders });
});

// PATCH /api/admin/orders/:orderId/status
router.patch("/orders/:orderId/status", async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status value." });
  }

  const updated = db.updateOrderStatus(req.params.orderId, status);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  try {
    await sheets.updateOrderStatusInSheet(req.params.orderId, status);
  } catch (err) {
    console.error("[admin] Failed to sync status to Google Sheets:", err);
  }

  res.json({ success: true, order: updated });
});

// ---------- Product management ----------

// GET /api/admin/products
router.get("/products", (req, res) => {
  res.json({ success: true, products: db.getProducts() });
});

// POST /api/admin/products — add a new product
router.post("/products", (req, res) => {
  const { name, price, image, sizes, description, category } = req.body;

  if (!name || !price || !image || !Array.isArray(sizes) || sizes.length === 0) {
    return res.status(400).json({ success: false, message: "Name, price, image, and at least one size are required." });
  }

  const id = "P" + Date.now().toString().slice(-8);
  const product = {
    id,
    name,
    price: Number(price),
    image,
    sizes,
    description: description || "",
    category: category || "General",
    inStock: true,
  };

  db.addProduct(product);
  res.status(201).json({ success: true, product });
});

// PUT /api/admin/products/:id — edit product (price, sizes, description, stock, etc.)
router.put("/products/:id", (req, res) => {
  const updates = { ...req.body };
  delete updates.id; // never allow changing the ID

  if (updates.price !== undefined) updates.price = Number(updates.price);

  const updated = db.updateProduct(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }
  res.json({ success: true, product: updated });
});

// PATCH /api/admin/products/:id/stock — quick toggle for out-of-stock
router.patch("/products/:id/stock", (req, res) => {
  const { inStock } = req.body;
  const updated = db.updateProduct(req.params.id, { inStock: Boolean(inStock) });
  if (!updated) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }
  res.json({ success: true, product: updated });
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", (req, res) => {
  const deleted = db.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }
  res.json({ success: true });
});

module.exports = router;
