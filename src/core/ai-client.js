/* ══════════════════════════════════════════════════════════════
   NF-Team — AI / IPFS proxy client
   Asks the serverless API which providers are configured and points
   the matching feature modules at /api/ai/<kind>. Keys never reach
   the browser; modules fall back to procedural generation otherwise.
   ══════════════════════════════════════════════════════════════ */
import { NF_CONFIG } from './config.js';

const MODULES = {
  art: 'aiArtGenerator',
  story: 'storyCoPilot',
  fusion: 'smartFusionSuggestions',
  music: 'aiMusicComposer',
  model3d: 'model3DAI',
  style: 'styleTransferAPI',
};

let statusPromise = null;

export function getStatus() {
  if (!statusPromise) {
    statusPromise = fetch(`${NF_CONFIG.apiBase}/status`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return statusPromise;
}

export async function configureAIProxies() {
  const status = await getStatus();
  const enabled = (status && status.ai) || {};
  Object.entries(MODULES).forEach(([kind, global]) => {
    const mod = window[global];
    if (enabled[kind] && mod && typeof mod.configureAPI === 'function') {
      mod.configureAPI(`${NF_CONFIG.apiBase}/ai/${kind}`, null);
    }
  });
  return enabled;
}

/** Pin an asset + metadata to IPFS through the server (if configured) */
export async function pinToIPFS({ name, bytes, mime, metadata }) {
  const status = await getStatus();
  if (!status.ipfs) return null;
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  const res = await fetch(`${NF_CONFIG.apiBase}/ipfs/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mime, content: btoa(bin), metadata }),
  });
  if (!res.ok) throw new Error(`IPFS pin failed (${res.status})`);
  return res.json();
}

export const NFApi = { getStatus, configureAIProxies, pinToIPFS };
if (typeof window !== 'undefined') window.NFApi = NFApi;
