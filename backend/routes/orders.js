const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../services/fileDb");
const sheets = require("../services/googleSheets");
const telegram = require("../services/telegram");
const { validateOrderPayload } = require("../middleware/validate");

// In-memory idempotency cache: clientRequestId -> orderId, expires after 10 minutes.
// Prevents duplicate orders from double-clicks or resubmits, without needing a database.
const recentSubmissions = new Map();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

function cleanupOldSubmissions() {
  const now = Date.now();
  for (const [key, entry] of recentSubmissions.entries()) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL_MS) {
      recentSubmissions.delete(key);
    }
  }
}

function generateOrderId() {
  // Short, human-friendly order ID, e.g. ORD-7F3K9A
  const suffix = uuidv4().split("-")[0].toUpperCase();
  return `ORD-${suffix}`;
}

function formatDhakaTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// POST /api/orders — create a new order
router.post("/", async (req, res) => {
  try {
    cleanupOldSubmissions();

    const { clientRequestId } = req.body;

    // --- Duplicate submission guard ---
    if (clientRequestId) {
      const existing = recentSubmissions.get(clientRequestId);
      if (existing) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          order: existing.order,
        });
      }
    }

    // --- Validation ---
    const errors = validateOrderPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(" ") , errors });
    }

    const product = db.getProductById(req.body.productId);
    if (!product) {
      return res.status(400).json({ success: false, message: "Selected product could not be found." });
    }
    if (product.inStock === false) {
      return res.status(400).json({ success: false, message: "Sorry, this product is currently out of stock." });
    }
    if (!product.sizes.includes(req.body.size)) {
      return res.status(400).json({ success: false, message: "Selected size is not available for this product." });
    }

    const quantity = Number(req.body.quantity);
    const deliveryCharge = Number(req.body.deliveryCharge) || Number(process.env.DELIVERY_CHARGE_INSIDE_DHAKA) || 70;
    const productPrice = product.price;
    const totalAmount = productPrice * quantity + deliveryCharge;

    const orderId = generateOrderId();
    const now = new Date();

    const order = {
      orderId,
      dateTime: formatDhakaTime(now),
      timestamp: now.toISOString(),
      customerName: req.body.customerName.trim(),
      phone: req.body.phone.trim(),
      address: req.body.address.trim(),
      productName: product.name,
      productId: product.id,
      quantity,
      size: req.body.size,
      productPrice,
      deliveryCharge,
      totalAmount,
      paymentMethod: req.body.paymentMethod,
      transactionId: req.body.transactionId ? req.body.transactionId.trim() : "",
      customerNote: req.body.customerNote ? req.body.customerNote.trim() : "",
      status: "Pending",
    };

    // --- Persist locally first (source of truth for the admin dashboard) ---
    db.addOrder(order);

    // --- Cache for idempotency ---
    if (clientRequestId) {
      recentSubmissions.set(clientRequestId, { order, timestamp: Date.now() });
    }

    // --- Fire off Google Sheets + Telegram, but don't fail the order if these fail ---
    const results = await Promise.allSettled([
      sheets.appendOrder(order),
      telegram.sendOrderNotification(order),
    ]);

    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const label = i === 0 ? "Google Sheets" : "Telegram";
        console.error(`[orders] ${label} integration failed:`, result.reason);
      }
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("[orders] Failed to create order:", err);
    res.status(500).json({ success: false, message: "Something went wrong while placing your order. Please try again." });
  }
});

module.exports = router;
