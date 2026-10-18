/* ══════════════════════════════════════════════════════════════
   NF-Team — Reactive State Store
   Centralized state management with subscriptions & persistence
   ══════════════════════════════════════════════════════════════ */

const Store = (() => {
  // ─── Internal State ───
  const _state = {
    currentZone: 'neon-district',
    currentStudio: 'canvas',
    walletConnected: false,
    wallet: null,
    tokens: JSON.parse(localStorage.getItem('nf-team-tokens') || '[]'),
    peerCount: 1,
    user: JSON.parse(localStorage.getItem('nfteam_user') || 'null'),
    theme: 'dark',
    sidebarOpen: false,
    mobileMenuOpen: false,
    activeModal: null,
    notifications: [],
    isLoading: false,
  };

  // ─── Subscribers (keyed by state path) ───
  const _subscribers = new Map();
  let _globalSubscribers = [];

  // ─── Deep clone helper ───
  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const clone = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clone[key] = deepClone(obj[key]);
      }
    }
    return clone;
  }

  // ─── Get state (returns immutable copy) ───
  function get(path) {
    if (!path) return deepClone(_state);
    const keys = path.split('.');
    let val = _state;
    for (const key of keys) {
      if (val === undefined || val === null) return undefined;
      val = val[key];
    }
    return deepClone(val);
  }

  // ─── Set state & notify subscribers ───
  function set(path, value) {
    const keys = path.split('.');
    let target = _state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const oldValue = target[lastKey];
    target[lastKey] = value;

    // Persist certain state keys
    _persistIfNeeded(path, value);

    // Notify path-specific subscribers
    if (_subscribers.has(path)) {
      _subscribers.get(path).forEach(fn => {
        try { fn(value, oldValue, path); } catch (e) { console.error('[Store] Subscriber error:', e); }
      });
    }

    // Notify global subscribers
    _globalSubscribers.forEach(fn => {
      try { fn(path, value, oldValue); } catch (e) { console.error('[Store] Global subscriber error:', e); }
    });

    // Emit custom event for DOM integration
    document.dispatchEvent(new CustomEvent('store:change', {
      detail: { path, value, oldValue }
    }));
  }

  // ─── Batch updates (single notification) ───
  function batch(updates) {
    const changes = [];
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split('.');
      let target = _state;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in target)) target[keys[i]] = {};
        target = target[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      const oldValue = target[lastKey];
      target[lastKey] = value;
      changes.push({ path, value, oldValue });
      _persistIfNeeded(path, value);
    }

    // Notify all at once
    changes.forEach(({ path, value, oldValue }) => {
      if (_subscribers.has(path)) {
        _subscribers.get(path).forEach(fn => fn(value, oldValue, path));
      }
    });

    _globalSubscribers.forEach(fn => {
      changes.forEach(({ path, value, oldValue }) => fn(path, value, oldValue));
    });
  }

  // ─── Subscribe to state changes ───
  function subscribe(path, callback) {
    if (typeof path === 'function') {
      // Global subscriber
      _globalSubscribers.push(path);
      return () => {
        _globalSubscribers = _globalSubscribers.filter(fn => fn !== path);
      };
    }

    if (!_subscribers.has(path)) {
      _subscribers.set(path, new Set());
    }
    _subscribers.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = _subscribers.get(path);
      if (subs) subs.delete(callback);
    };
  }

  // ─── Computed values ───
  function computed(deps, computeFn) {
    let cached;
    let dirty = true;

    deps.forEach(dep => {
      subscribe(dep, () => { dirty = true; });
    });

    return () => {
      if (dirty) {
        cached = computeFn(get);
        dirty = false;
      }
      return cached;
    };
  }

  // ─── Persistence ───
  const _persistKeys = {
    'tokens': 'nf-team-tokens',
    'user': 'nfteam_user',
    'currentZone': 'nfteam_zone',
    'theme': 'nfteam_theme',
  };

  function _persistIfNeeded(path, value) {
    const rootKey = path.split('.')[0];
    if (_persistKeys[rootKey]) {
      try {
        localStorage.setItem(_persistKeys[rootKey], JSON.stringify(value));
      } catch (e) {
        console.warn('[Store] Persistence failed:', e);
      }
    }
  }

  // ─── Load persisted state ───
  function hydrate() {
    for (const [stateKey, storageKey] of Object.entries(_persistKeys)) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        try {
          _state[stateKey] = JSON.parse(saved);
        } catch (e) { /* ignore parse errors */ }
      }
    }
  }

  // Initialize
  hydrate();

  return { get, set, batch, subscribe, computed };
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.Store = Store;
}
