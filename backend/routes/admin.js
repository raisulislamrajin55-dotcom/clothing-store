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

// GET /api/admin/orders
router.get("/orders", async (req, res) => {
  try {
    let orders = await db.getOrders();
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
  } catch (err) {
    console.error("[admin] Failed to fetch orders:", err);
    res.status(500).json({ success: false, message: "Failed to load orders." });
  }
});

// PATCH /api/admin/orders/:orderId/status
router.patch("/orders/:orderId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const updated = await db.updateOrderStatus(req.params.orderId, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    try {
      await sheets.updateOrderStatusInSheet(req.params.orderId, status);
    } catch (err) {
      console.error("[admin] Failed to sync status to Google Sheets:", err);
    }

    res.json({ success: true, order: updated });
  } catch (err) {
    console.error("[admin] Failed to update order status:", err);
    res.status(500).json({ success: false, message: "Failed to update order status." });
  }
});

// ---------- Product management ----------

router.get("/products", async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error("[admin] Failed to fetch products:", err);
    res.status(500).json({ success: false, message: "Failed to load products." });
  }
});

router.post("/products", async (req, res) => {
  try {
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

    const created = await db.addProduct(product);
    res.status(201).json({ success: true, product: created });
  } catch (err) {
    console.error("[admin] Failed to add product:", err);
    res.status(500).json({ success: false, message: "Failed to add product." });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;

    if (updates.price !== undefined) updates.price = Number(updates.price);

    const updated = await db.updateProduct(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, product: updated });
  } catch (err) {
    console.error("[admin] Failed to update product:", err);
    res.status(500).json({ success: false, message: "Failed to update product." });
  }
});

router.patch("/products/:id/stock", async (req, res) => {
  try {
    const { inStock } = req.body;
    const updated = await db.updateProduct(req.params.id, { inStock: Boolean(inStock) });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, product: updated });
  } catch (err) {
    console.error("[admin] Failed to update stock:", err);
    res.status(500).json({ success: false, message: "Failed to update stock." });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const deleted = await db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] Failed to delete product:", err);
    res.status(500).json({ success: false, message: "Failed to delete product." });
  }
});

module.exports = router;