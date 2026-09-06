const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const Order = require('../models/Order');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Middleware for JWT Authentication
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
};

// --- AUTHENTICATION ROUTE ---

// Admin Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || '123456';

    if (username === adminUser && password === adminPass) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token });
    }

    res.status(400).json({ success: false, message: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// --- ORDERS API ROUTES ---

// 1. Get All Orders
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { q, status } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { orderId: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// 2. Update Order Status
router.patch('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { $or: [{ _id: req.params.id }, { orderId: req.params.id }] },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// --- PRODUCTS API ROUTES ---

// 3. Get All Admin Products
router.get('/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    const formattedProducts = products.map(p => ({
      ...p._doc,
      id: p._id.toString()
    }));
    res.json({ success: true, products: formattedProducts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// 4. Add Product
router.post('/products', adminAuth, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, product: { ...newProduct._doc, id: newProduct._id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// 5. Edit/Update Product
router.put('/products/:id', adminAuth, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: { ...updatedProduct._doc, id: updatedProduct._id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// 6. Stock Toggle
router.patch('/products/:id/stock', adminAuth, async (req, res) => {
  try {
    const { inStock } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { inStock }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update stock' });
  }
});

// 7. Delete Product Permanently
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

module.exports = router;