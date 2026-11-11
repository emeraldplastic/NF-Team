import { send, readJSON, rateLimited, clampText } from '../_lib.js';

const PINATA = 'https://api.pinata.cloud/pinning';
const MAX_BYTES = 3 * 1024 * 1024;

async function pinata(path, init) {
  const res = await fetch(`${PINATA}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${process.env.PINATA_JWT}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error?.details || `Pinata error ${res.status}`), { status: 502 });
  return data;
}

/** POST /api/ipfs/pin — pin the artwork, then ERC-721 metadata pointing at it */
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!process.env.PINATA_JWT) return send(res, 501, { error: 'IPFS pinning is not configured' });
  if (rateLimited(req, { limit: 10 })) return send(res, 429, { error: 'Too many requests, slow down' });
  try {
    const body = await readJSON(req, 4_500_000);
    const bytes = Buffer.from(String(body.content || ''), 'base64');
    if (!bytes.length) return send(res, 400, { error: 'content is required' });
    if (bytes.length > MAX_BYTES) return send(res, 413, { error: 'Asset too large (max 3 MB)' });
    const name = clampText(body.name, 120) || 'NF-Team asset';
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(body.mime || '') ? body.mime : 'application/octet-stream';

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mime }), name.replace(/[^\w.-]+/g, '_'));
    form.append('pinataMetadata', JSON.stringify({ name }));
    const file = await pinata('/pinFileToIPFS', { method: 'POST', body: form });

    const metadata = { ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}), name, image: `ipfs://${file.IpfsHash}` };
    const meta = await pinata('/pinJSONToIPFS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinataContent: metadata, pinataMetadata: { name: `${name} metadata` } }),
    });
    return send(res, 200, { cid: file.IpfsHash, metadataCid: meta.IpfsHash });
  } catch (err) {
    return send(res, err.status || 500, { error: err.status ? err.message : 'Internal error' });
  }
}
