/* NF-Team — runtime configuration (from Vite env vars, overridable via window.NF_CONFIG) */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const NF_CONFIG = Object.freeze({
  multiplayerUrl: env.VITE_MULTIPLAYER_URL || 'local',
  apiBase: env.VITE_API_BASE || '/api',
  ...(typeof window !== 'undefined' && window.NF_CONFIG ? window.NF_CONFIG : {}),
});

if (typeof window !== 'undefined') window.NF_CONFIG = NF_CONFIG;

export default NF_CONFIG;
