const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    dateTime: { type: String, required: true },
    timestamp: { type: String, required: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    productName: { type: String, required: true },
    productId: { type: String, required: true },
    quantity: { type: Number, required: true },
    size: { type: String, required: true },
    productPrice: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    transactionId: { type: String, default: "" },
    customerNote: { type: String, default: "" },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Order", orderSchema);