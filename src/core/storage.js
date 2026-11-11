/* ══════════════════════════════════════════════════════════════
   NF-Team — Storage layer
   The single place that touches window.localStorage. Every module
   reads/writes through NFStorage so quota errors, private-mode
   failures and cross-tab change events are handled in one spot.
   ══════════════════════════════════════════════════════════════ */

const memory = new Map();
const listeners = new Set();

function backend() {
  try {
    const ls = window.localStorage;
    const probe = '__nf_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

const ls = typeof window !== 'undefined' ? backend() : null;

function notify(key, value, source) {
  listeners.forEach(fn => {
    try { fn(key, value, source); } catch (e) { console.error('[NFStorage] listener error', e); }
  });
}

export const NFStorage = {
  getItem(key) {
    if (ls) return ls.getItem(key);
    return memory.has(key) ? memory.get(key) : null;
  },

  setItem(key, value) {
    const str = String(value);
    try {
      if (ls) ls.setItem(key, str);
      else memory.set(key, str);
    } catch (e) {
      console.warn(`[NFStorage] could not persist "${key}":`, e.name);
      memory.set(key, str);
    }
    notify(key, str, 'local');
  },

  removeItem(key) {
    if (ls) ls.removeItem(key);
    memory.delete(key);
    notify(key, null, 'local');
  },

  getJSON(key, fallback = null) {
    const raw = this.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },

  setJSON(key, value) {
    this.setItem(key, JSON.stringify(value));
  },

  keys() {
    if (ls) return Array.from({ length: ls.length }, (_, i) => ls.key(i));
    return Array.from(memory.keys());
  },

  /** Subscribe to changes from this tab and from other tabs */
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key) notify(e.key, e.newValue, 'remote'); });
  window.NFStorage = NFStorage;
}

export default NFStorage;
