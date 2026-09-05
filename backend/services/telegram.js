const fetch = require("node-fetch");

function isConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function buildMessage(order) {
  const paymentLabel =
    {
      cod: "Cash on Delivery",
      bkash: "bKash",
      nagad: "Nagad",
    }[order.paymentMethod] || order.paymentMethod;

  const lines = [
    "🛍️ NEW ORDER",
    "",
    `🆔 Order ID: #${order.orderId}`,
    `👤 Customer: ${order.customerName}`,
    `📞 Phone: ${order.phone}`,
    `👗 Product: ${order.productName}`,
    `🔢 Quantity: ${order.quantity}`,
    `📏 Size: ${order.size}`,
    `🏠 Address: ${order.address}`,
    "",
    `💰 Product Total: ৳${order.productPrice * order.quantity}`,
    `🚚 Delivery: ৳${order.deliveryCharge}`,
    `💵 Total: ৳${order.totalAmount}`,
    "",
    `💳 Payment: ${paymentLabel}`,
  ];

  if (order.transactionId) {
    lines.push(`🔐 Transaction ID: ${order.transactionId}`);
  }

  if (order.customerNote) {
    lines.push("", `📝 Note: ${order.customerNote}`);
  }

  lines.push("", `📅 Date: ${order.dateTime}`, `📦 Status: ${order.status}`);

  return lines.join("\n");
}

async function sendOrderNotification(order) {
  if (!isConfigured()) {
    console.warn(
      "[telegram] Not configured — skipping Telegram notification."
    );
    return { skipped: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const text = buildMessage(order);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("[telegram] Failed to send message:", data);
  }
  return data;
}

module.exports = { sendOrderNotification, isConfigured };
