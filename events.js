/* ══════════════════════════════════════════════════════════════
   NF-Team — Event Bus
   Decoupled publish/subscribe system for cross-component comms
   ══════════════════════════════════════════════════════════════ */

const EventBus = (() => {
  const _listeners = new Map();
  const _onceListeners = new Map();
  let _history = [];
  const MAX_HISTORY = 50;

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports wildcards: 'zone:*')
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  function on(event, callback) {
    if (!_listeners.has(event)) {
      _listeners.set(event, new Set());
    }
    _listeners.get(event).add(callback);

    return () => off(event, callback);
  }

  /**
   * Subscribe to an event once
   */
  function once(event, callback) {
    if (!_onceListeners.has(event)) {
      _onceListeners.set(event, new Set());
    }
    _onceListeners.get(event).add(callback);

    return () => {
      const set = _onceListeners.get(event);
      if (set) set.delete(callback);
    };
  }

  /**
   * Unsubscribe from an event
   */
  function off(event, callback) {
    const set = _listeners.get(event);
    if (set) set.delete(callback);
  }

  /**
   * Emit an event with optional payload
   * @param {string} event - Event name
   * @param {*} payload - Event data
   */
  function emit(event, payload) {
    // Record in history
    _history.push({ event, payload, timestamp: Date.now() });
    if (_history.length > MAX_HISTORY) _history.shift();

    // Exact match listeners
    if (_listeners.has(event)) {
      _listeners.get(event).forEach(fn => {
        try { fn(payload, event); }
        catch (e) { console.error(`[EventBus] Error in listener for "${event}":`, e); }
      });
    }

    // Once listeners
    if (_onceListeners.has(event)) {
      _onceListeners.get(event).forEach(fn => {
        try { fn(payload, event); }
        catch (e) { console.error(`[EventBus] Error in once-listener for "${event}":`, e); }
      });
      _onceListeners.delete(event);
    }

    // Wildcard listeners (e.g., 'zone:*' matches 'zone:changed')
    _listeners.forEach((callbacks, pattern) => {
      if (pattern.endsWith(':*')) {
        const prefix = pattern.slice(0, -1);
        if (event.startsWith(prefix) && event !== pattern) {
          callbacks.forEach(fn => {
            try { fn(payload, event); }
            catch (e) { console.error(`[EventBus] Error in wildcard listener for "${pattern}":`, e); }
          });
        }
      }
    });
  }

  /**
   * Emit an event and wait for async handlers
   */
  async function emitAsync(event, payload) {
    const promises = [];

    if (_listeners.has(event)) {
      _listeners.get(event).forEach(fn => {
        promises.push(Promise.resolve().then(() => fn(payload, event)));
      });
    }

    return Promise.all(promises);
  }

  /**
   * Clear all listeners for an event (or all events)
   */
  function clear(event) {
    if (event) {
      _listeners.delete(event);
      _onceListeners.delete(event);
    } else {
      _listeners.clear();
      _onceListeners.clear();
    }
  }

  /**
   * Get event history
   */
  function history(filter) {
    if (!filter) return [..._history];
    return _history.filter(h => h.event.startsWith(filter));
  }

  return { on, once, off, emit, emitAsync, clear, history };
})();

// ─── Standard Event Names ───
const Events = Object.freeze({
  // Navigation
  NAV_PAGE_CHANGE: 'nav:page:change',
  NAV_MOBILE_TOGGLE: 'nav:mobile:toggle',
  NAV_SCROLL: 'nav:scroll',

  // Zone / Theme
  ZONE_CHANGED: 'zone:changed',
  THEME_CHANGED: 'theme:changed',

  // Studio
  STUDIO_TAB_CHANGE: 'studio:tab:change',
  STUDIO_TOOL_SELECT: 'studio:tool:select',

  // NFT
  NFT_MINTED: 'nft:minted',
  NFT_FORKED: 'nft:forked',
  NFT_REMIXED: 'nft:remixed',

  // Wallet
  WALLET_CONNECTED: 'wallet:connected',
  WALLET_DISCONNECTED: 'wallet:disconnected',

  // UI
  MODAL_OPEN: 'ui:modal:open',
  MODAL_CLOSE: 'ui:modal:close',
  TOAST_SHOW: 'ui:toast:show',
  LOADING_START: 'ui:loading:start',
  LOADING_END: 'ui:loading:end',
  SCROLL_REVEAL: 'ui:scroll:reveal',

  // Collaboration
  PEER_JOINED: 'collab:peer:joined',
  PEER_LEFT: 'collab:peer:left',
  CURSOR_MOVED: 'collab:cursor:moved',
});

if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
  window.Events = Events;
}
