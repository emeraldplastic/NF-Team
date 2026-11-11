/* Shared helpers for NF-Team serverless functions (Vercel Node runtime) */

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readJSON(req, limitBytes = 1_000_000) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// Best-effort per-instance limiter (serverless instances are short-lived; use a KV store for strict limits)
const hits = new Map();
export function rateLimited(req, { limit = 20, windowMs = 60_000 } = {}) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : (fwd || '')).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

export function aiStatus(env = process.env) {
  const openai = Boolean(env.OPENAI_API_KEY);
  return { art: openai, story: openai, fusion: openai, music: false, model3d: false, style: false };
}

export function clampText(value, max) {
  return String(value ?? '').slice(0, max);
}
