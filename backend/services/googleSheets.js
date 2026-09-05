const { google } = require("googleapis");

const SHEET_NAME = "Orders";

// Column order — must match the header row you create in the sheet (see README)
const HEADERS = [
  "Order ID",
  "Date & Time",
  "Customer Name",
  "Phone",
  "Address",
  "Product Name",
  "Product ID",
  "Quantity",
  "Size",
  "Product Price",
  "Delivery Charge",
  "Total Amount",
  "Payment Method",
  "Transaction ID",
  "Customer Note",
  "Order Status",
];

let sheetsClient = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    return null;
  }

  return new google.auth.JWT(email, null, key, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

function getClient() {
  if (sheetsClient) return sheetsClient;
  const auth = getAuth();
  if (!auth) return null;
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

/**
 * Ensures the header row exists. Safe to call on every append (cheap check).
 */
async function ensureHeaders() {
  const client = getClient();
  if (!client) return;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const res = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:P1`,
  });

  const firstRow = res.data.values && res.data.values[0];
  if (!firstRow || firstRow.length === 0) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

/**
 * Appends one order row to the Google Sheet.
 * @param {object} order - normalized order object
 */
async function appendOrder(order) {
  if (!isConfigured()) {
    console.warn(
      "[googleSheets] Not configured — skipping Google Sheets write. Order was still saved locally."
    );
    return { skipped: true };
  }

  const client = getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await ensureHeaders();

  const row = [
    order.orderId,
    order.dateTime,
    order.customerName,
    order.phone,
    order.address,
    order.productName,
    order.productId,
    order.quantity,
    order.size,
    order.productPrice,
    order.deliveryCharge,
    order.totalAmount,
    order.paymentMethod,
    order.transactionId || "",
    order.customerNote || "",
    order.status,
  ];

  await client.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:P`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return { skipped: false };
}

/**
 * Updates the "Order Status" column (last column) for a given Order ID.
 */
async function updateOrderStatusInSheet(orderId, newStatus) {
  if (!isConfigured()) return { skipped: true };

  const client = getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const res = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === orderId);
  if (rowIndex === -1) return { found: false };

  const sheetRowNumber = rowIndex + 1; // 1-indexed, matches A1 notation
  await client.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!P${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[newStatus]] },
  });

  return { found: true };
}

module.exports = {
  isConfigured,
  appendOrder,
  updateOrderStatusInSheet,
};
