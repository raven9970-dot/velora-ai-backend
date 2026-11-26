'use strict';
const crypto = require('node:crypto');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}
function send(res, status, data) {
  res.status(status).json(data);
}
function authorized(req) {
  const token = process.env.VELORA_ACCESS_TOKEN || '';
  if (token.length < 24) return false;
  const h = req.headers.authorization || '';
  const supplied = h.startsWith('Bearer ') ? h.slice(7) : '';
  const a = Buffer.from(supplied), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// Best-effort limiter (serverless = memori tidak dibagi antar instance; token tetap pelindung utama).
const hits = new Map();
function rateAllowed(ip, limit) {
  const now = Date.now();
  const r = hits.get(ip) || { start: now, count: 0 };
  if (now - r.start >= 60000) { r.start = now; r.count = 0; }
  r.count += 1; hits.set(ip, r);
  return r.count <= limit;
}
module.exports = { cors, send, authorized, rateAllowed };
