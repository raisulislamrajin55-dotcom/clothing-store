const Product = require("../models/Product");
const Order = require("../models/Order");

function toPlain(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj._id;
  delete obj.__v;
  return obj;
}

// ---------- Products ----------
async function getProducts() {
  const products = await Product.find().sort({ createdAt: 1 });
  return products.map(toPlain);
}

async function getProductById(id) {
  const product = await Product.findOne({ id });
  return toPlain(product);
}

async function addProduct(product) {
  const created = await Product.create(product);
  return toPlain(created);
}

async function updateProduct(id, updates) {
  const updated = await Product.findOneAndUpdate({ id }, updates, { new: true });
  return toPlain(updated);
}

async function deleteProduct(id) {
  const result = await Product.deleteOne({ id });
  return result.deletedCount > 0;
}

// ---------- Orders ----------
async function getOrders() {
  const orders = await Order.find().sort({ createdAt: -1 });
  return orders.map(toPlain);
}

async function addOrder(order) {
  const created = await Order.create(order);
  return toPlain(created);
}

async function updateOrderStatus(orderId, status) {
  const updated = await Order.findOneAndUpdate({ orderId }, { status }, { new: true });
  return toPlain(updated);
}

async function orderExists(orderId) {
  const found = await Order.findOne({ orderId });
  return Boolean(found);
}

module.exports = {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  addOrder,
  updateOrderStatus,
  orderExists,
};