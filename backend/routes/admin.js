const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order'); // Mongo Order model
const adminAuth = require('../middleware/adminAuth'); // Token Auth Check

// --- ORDERS API ---

// 1. Fetch Orders (With Search & Status Filter)
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

// --- PRODUCTS API ---

// 3. Fetch All Products
router.get('/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    // Ensuring frontend mapping compatibility (p.id)
    const formattedProducts = products.map(p => ({
      ...p._doc,
      id: p._id.toString()
    }));
    res.json({ success: true, products: formattedProducts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// 4. Add New Product
router.post('/products', adminAuth, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, product: { ...newProduct._doc, id: newProduct._id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// 5. Update Product (Edit)
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

// 7. Delete Product
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