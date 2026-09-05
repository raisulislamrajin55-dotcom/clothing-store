const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const ORDERS_PATH = path.join(__dirname, "..", "data", "orders.json");

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---------- Products ----------
function getProducts() {
  return readJson(PRODUCTS_PATH);
}

function saveProducts(products) {
  writeJson(PRODUCTS_PATH, products);
}

function getProductById(id) {
  return getProducts().find((p) => p.id === id);
}

function addProduct(product) {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
  return product;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates };
  saveProducts(products);
  return products[idx];
}

function deleteProduct(id) {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id);
  saveProducts(filtered);
  return filtered.length !== products.length;
}

// ---------- Orders (local mirror; Google Sheets is the primary record) ----------
function getOrders() {
  return readJson(ORDERS_PATH);
}

function saveOrders(orders) {
  writeJson(ORDERS_PATH, orders);
}

function addOrder(order) {
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
  return order;
}

function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1) return null;
  orders[idx].status = status;
  saveOrders(orders);
  return orders[idx];
}

function orderExists(orderId) {
  return getOrders().some((o) => o.orderId === orderId);
}

module.exports = {
  getProducts,
  saveProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  saveOrders,
  addOrder,
  updateOrderStatus,
  orderExists,
};
