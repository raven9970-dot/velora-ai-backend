'use strict';

// Dependency-free Node.js 20+ backend for VELORA AI Designer.
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const ROOT = __dirname;
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}
loadEnv(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.OPENAI_API_KEY || '';
const ACCESS_TOKEN = process.env.VELORA_ACCESS_TOKEN || '';
const LIMIT = Math.max(1, Number(process.env.DESIGNER_REQUESTS_PER_MINUTE || 3));
const MODEL_SET = new Set(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']);
const SIZE_SET = new Set(['1024x1024', '1024x1536', '1536x1024']);
const QUALITY_SET = new Set(['low', 'medium', 'high']);
const hits = new Map();
// Hanya file ini yang boleh diunduh publik (server.js, package.json, .env TIDAK).
const PUBLIC_FILES = new Set(['/index.html', '/velora-exporter.js']);

function setCors(req, res) {
  // Android local HTML commonly sends Origin: null. The bearer token is the actual access control.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}
function authorized(req) {
  if (!ACCESS_TOKEN || ACCESS_TOKEN.length < 24) return false;
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(ACCESS_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin'
  });
  res.end(body);
}

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Request terlalu besar.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now - v.start > 120_000) hits.delete(k); }, 60_000).unref();

function rateAllowed(ip) {
  const now = Date.now();
  const record = hits.get(ip) || { start: now, count: 0 };
  if (now - record.start >= 60_000) { record.start = now; record.count = 0; }
  record.count += 1;
  hits.set(ip, record);
  return record.count <= LIMIT;
}

async function generateImage(req, res) {
  if (!API_KEY) return sendJson(res, 503, { error: 'Penyedia AI belum dikonfigurasi. Tambahkan OPENAI_API_KEY pada file .env di server.' });
  const raw = await readBody(req);
  let input;
  try { input = JSON.parse(raw || '{}'); }
  catch { return sendJson(res, 400, { error: 'Format JSON tidak valid.' }); }

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const model = MODEL_SET.has(input.model) ? input.model : 'gpt-image-2.5-flare';
  const size = SIZE_SET.has(input.size) ? input.size : '1024x1024';
  const quality = QUALITY_SET.has(input.quality) ? input.quality : 'medium';
  if (!prompt) return sendJson(res, 400, { error: 'Prompt desain wajib diisi.' });
  if (prompt.length > 4000) return sendJson(res, 400, { error: 'Prompt terlalu panjang (maksimum 4.000 karakter).' });

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, size, quality, n: 1, output_format: 'png' }),
      signal: AbortSignal.timeout(180_000)
    });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return sendJson(res, timeout ? 504 : 502, { error: timeout ? 'Permintaan gambar melewati batas waktu.' : 'Tidak dapat menghubungi penyedia AI. Periksa koneksi server.' });
  }

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const message = payload?.error?.message || `Penyedia AI mengembalikan HTTP ${upstream.status}.`;
    return sendJson(res, upstream.status === 429 ? 429 : 502, { error: message });
  }
  const image = payload?.data?.[0]?.b64_json;
  if (!image) return sendJson(res, 502, { error: 'Respons penyedia AI tidak berisi gambar base64.' });
  return sendJson(res, 200, { ok: true, model, size, image });
}

const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.md':'text/markdown; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && url.pathname === '/healthz') return sendJson(res, 200, { ok: true, service: 'VELORA AI Designer' });
  if (url.pathname.startsWith('/api/') && !authorized(req)) return sendJson(res, 401, { error: 'Token akses VELORA tidak valid atau belum dikonfigurasi.' });
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'VELORA AI Designer', aiConfigured: Boolean(API_KEY) });
  }
  if (req.method === 'POST' && url.pathname === '/api/ai/designer/generate') {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (!rateAllowed(ip)) return sendJson(res, 429, { error: 'Batas permintaan sementara tercapai. Coba lagi satu menit kemudian.' });
    try { return await generateImage(req, res); }
    catch (error) { return sendJson(res, error.status || 500, { error: error.status === 413 ? error.message : 'Terjadi kesalahan pada backend VELORA.' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method tidak didukung.' });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return sendJson(res, 400, { error: 'URL tidak valid.' }); }
  if (pathname === '/') pathname = '/index.html';
  if (!PUBLIC_FILES.has(pathname)) return sendJson(res, 404, { error: 'File tidak ditemukan.' });
  const target = path.join(ROOT, pathname);
  fs.readFile(target, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'File tidak ditemukan.' });
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'SAMEORIGIN'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VELORA 6.1 berjalan di http://localhost:${PORT}`);
  console.log(`AI provider: ${API_KEY ? 'configured' : 'NOT configured'}`);
  console.log(`Access token: ${ACCESS_TOKEN.length >= 24 ? 'configured' : 'MISSING (minimum 24 characters)'}`);
});
