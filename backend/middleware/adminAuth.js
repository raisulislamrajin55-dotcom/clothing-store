const crypto = require("crypto");

// Very lightweight session token: HMAC(username + expiry) signed with JWT_SECRET.
// Good enough for a single-admin dashboard without adding a full auth library.

function sign(payload) {
  const secret = process.env.JWT_SECRET || "insecure-fallback-secret";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  return hmac.digest("hex");
}

function createToken(username) {
  const expiry = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const payload = `${username}.${expiry}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64");
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [username, expiry, signature] = decoded.split(".");
    const expected = sign(`${username}.${expiry}`);
    if (expected !== signature) return null;
    if (Date.now() > Number(expiry)) return null;
    return { username };
  } catch (err) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Login required." });
  }

  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }

  req.admin = session;
  next();
}

module.exports = { createToken, verifyToken, requireAdmin };
