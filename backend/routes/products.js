const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get All Products for Frontend
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    const formattedProducts = products.map(p => ({
      ...p._doc,
      id: p._id.toString()
    }));
    res.json(formattedProducts);
  } catch (err) {
    console.error('Fetch Products Error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get Single Product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      ...product._doc,
      id: product._id.toString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching product details' });
  }
});

module.exports = router;