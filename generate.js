'use strict';
const { cors, send, authorized, rateAllowed } = require('../../_lib');

const MODELS = new Set(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']);
const SIZES = new Set(['1024x1024', '1024x1536', '1536x1024']);
const QUALITIES = new Set(['low', 'medium', 'high']);

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak didukung.' });
  if (!authorized(req)) return send(res, 401, { error: 'Token akses VELORA tidak valid atau belum dikonfigurasi.' });

  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) return send(res, 503, { error: 'OPENAI_API_KEY belum diisi di Environment Variables Vercel.' });

  const limit = Math.max(1, Number(process.env.DESIGNER_REQUESTS_PER_MINUTE || 3));
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!rateAllowed(ip, limit)) return send(res, 429, { error: 'Batas permintaan sementara tercapai. Coba lagi satu menit kemudian.' });

  let input = req.body;
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { input = null; } }
  if (!input || typeof input !== 'object') return send(res, 400, { error: 'Format JSON tidak valid.' });

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const model = MODELS.has(input.model) ? input.model : 'gpt-image-2.5-flare';
  const size = SIZES.has(input.size) ? input.size : '1024x1024';
  const quality = QUALITIES.has(input.quality) ? input.quality : 'medium';
  if (!prompt) return send(res, 400, { error: 'Prompt desain wajib diisi.' });
  if (prompt.length > 4000) return send(res, 400, { error: 'Prompt terlalu panjang (maksimum 4.000 karakter).' });

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // JPEG agar respons tetap di bawah batas ukuran respons Vercel (~4,5 MB).
      body: JSON.stringify({ model, prompt, size, quality, n: 1, output_format: 'jpeg', output_compression: 85 }),
      signal: AbortSignal.timeout(250000)
    });
  } catch (error) {
    const timeout = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return send(res, timeout ? 504 : 502, { error: timeout ? 'Permintaan gambar melewati batas waktu.' : 'Tidak dapat menghubungi penyedia AI.' });
  }

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const message = (payload && payload.error && payload.error.message) || `Penyedia AI mengembalikan HTTP ${upstream.status}.`;
    return send(res, upstream.status === 429 ? 429 : 502, { error: message });
  }
  const b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!b64) return send(res, 502, { error: 'Respons penyedia AI tidak berisi gambar.' });
  return send(res, 200, { ok: true, model, size, image: `data:image/jpeg;base64,${b64}` });
};
