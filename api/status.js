import { send, aiStatus } from './_lib.js';

/** GET /api/status — which server-side integrations are configured (never exposes secrets) */
export default function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  return send(res, 200, {
    ai: aiStatus(),
    ipfs: Boolean(process.env.PINATA_JWT),
    multiplayer: Boolean(process.env.VITE_MULTIPLAYER_URL),
  });
}
