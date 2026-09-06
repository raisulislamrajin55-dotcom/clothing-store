const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    sizes: { type: [String], required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Product", productSchema);