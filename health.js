'use strict';
const { cors, send, authorized } = require('./_lib');
module.exports = (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!authorized(req)) return send(res, 401, { error: 'Token akses VELORA tidak valid atau belum dikonfigurasi.' });
  return send(res, 200, { ok: true, service: 'VELORA AI Designer', aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
};
