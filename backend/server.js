require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");

const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security & parsing ---
app.use(
  helmet({
    contentSecurityPolicy: false, // keep simple for beginner deployment; tighten later if needed
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);
app.use(express.json({ limit: "1mb" }));

// Basic rate limiting on order creation to reduce spam / abuse
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 order attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again in a few minutes." },
});

// --- API routes ---
app.use("/api/products", productsRouter);
app.use("/api/orders", orderLimiter, ordersRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running." });
});

// --- Serve the frontend (store + admin dashboard) ---
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

// --- 404 handler for unknown API routes ---
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Not found." });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`✅ Clothing store server running on http://localhost:${PORT}`);
});
