import { NFStorage } from './storage.js';
/* ══════════════════════════════════════════════════════════════
   NF-Team — Security Primitives
   HTML escaping, password hashing, ECDSA token signing, wallets
   ══════════════════════════════════════════════════════════════ */

const NFSecurity = (() => {
  const enc = new TextEncoder();

  // ─── HTML escaping ───
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"'`]/g, ch => HTML_ESCAPES[ch]);
  }

  // ─── Encoding helpers ───
  function bytesToB64url(bytes) {
    let bin = '';
    new Uint8Array(bytes).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlToBytes(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const bin = atob(b64);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }
  function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  }
  function randomHex(byteLength) {
    return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
  }
  async function sha256Hex(data) {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    return bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
  }

  // Deterministic JSON (sorted keys) so signatures are reproducible
  function canonicalJSON(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
    return '{' + Object.keys(value).sort()
      .filter(k => value[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
  }

  function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  // ─── Password hashing (PBKDF2-SHA256) ───
  const PBKDF2_ITERATIONS = 310000;

  async function hashPassword(password, saltB64, iterations = PBKDF2_ITERATIONS) {
    const salt = saltB64 ? b64urlToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
    return { algo: 'PBKDF2-SHA256', iterations, salt: bytesToB64url(salt), hash: bytesToB64url(bits) };
  }

  async function verifyPassword(password, record) {
    if (!record || !record.salt || !record.hash) return false;
    const candidate = await hashPassword(password, record.salt, record.iterations || PBKDF2_ITERATIONS);
    return timingSafeEqual(candidate.hash, record.hash);
  }

  // ─── Key storage (IndexedDB, non-extractable CryptoKeys) ───
  const DB_NAME = 'nfteam-keys';
  const STORE = 'keys';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPut(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ─── ECDSA P-256 signing key ───
  const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
  const SIGN_ALGO = { name: 'ECDSA', hash: 'SHA-256' };
  let _keyPromise = null;

  function getSigningKey() {
    if (_keyPromise) return _keyPromise;
    _keyPromise = (async () => {
      let entry = await idbGet('signing-key');
      if (!entry) {
        const pair = await crypto.subtle.generateKey(ECDSA, false, ['sign', 'verify']);
        const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
        entry = { privateKey: pair.privateKey, publicKey: pair.publicKey, publicJwk, createdAt: Date.now() };
        await idbPut('signing-key', entry);
      }
      return entry;
    })();
    _keyPromise.catch(() => { _keyPromise = null; });
    return _keyPromise;
  }

  async function publicKeyFingerprint(jwk) {
    return sha256Hex(canonicalJSON({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }));
  }

  // Sign an arbitrary JSON payload; returns a detached signature envelope
  async function signPayload(payload) {
    const key = await getSigningKey();
    const message = canonicalJSON(payload);
    const sig = await crypto.subtle.sign(SIGN_ALGO, key.privateKey, enc.encode(message));
    return {
      alg: 'ES256',
      publicKey: { kty: key.publicJwk.kty, crv: key.publicJwk.crv, x: key.publicJwk.x, y: key.publicJwk.y },
      payloadHash: await sha256Hex(message),
      value: bytesToB64url(sig),
      signedAt: Date.now(),
    };
  }

  async function verifyPayload(payload, envelope) {
    try {
      if (!envelope || envelope.alg !== 'ES256' || !envelope.publicKey || !envelope.value) return false;
      const pub = await crypto.subtle.importKey('jwk', { ...envelope.publicKey, ext: true }, ECDSA, false, ['verify']);
      return await crypto.subtle.verify(SIGN_ALGO, pub, b64urlToBytes(envelope.value), enc.encode(canonicalJSON(payload)));
    } catch {
      return false;
    }
  }

  // Fields of a token covered by its signature
  function tokenSigningPayload(token) {
    return {
      id: token.id,
      type: token.type,
      zone: token.zone,
      owner: token.owner,
      creator: token.creator || token.owner,
      contentHash: token.contentHash || null,
      title: token.metadata && token.metadata.title,
      createdAt: token.metadata && token.metadata.createdAt,
    };
  }

  async function signToken(token) {
    return signPayload(tokenSigningPayload(token));
  }

  async function verifyToken(token) {
    return verifyPayload(tokenSigningPayload(token), token && token.signature);
  }

  // ─── Wallet (EIP-1193 provider, or a browser-held signing key) ───
  const WALLET_KEY = 'nfteam_wallet';
  const _walletListeners = new Set();

  function _setWallet(wallet) {
    if (wallet) NFStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    else NFStorage.removeItem(WALLET_KEY);
    if (typeof Store !== 'undefined') {
      Store.set('walletConnected', !!wallet);
      Store.set('wallet', wallet);
    }
    if (typeof EventBus !== 'undefined' && typeof Events !== 'undefined') {
      EventBus.emit(wallet ? Events.WALLET_CONNECTED : Events.WALLET_DISCONNECTED, { wallet });
    }
    _walletListeners.forEach(fn => { try { fn(wallet); } catch (e) { console.error(e); } });
    return wallet;
  }

  function hasInjectedProvider() {
    return typeof window !== 'undefined' && !!window.ethereum && typeof window.ethereum.request === 'function';
  }

  async function _browserKeyAddress() {
    const key = await getSigningKey();
    return '0x' + (await publicKeyFingerprint(key.publicJwk)).slice(-40);
  }

  const Wallet = {
    current() {
      try { return JSON.parse(NFStorage.getItem(WALLET_KEY) || 'null'); } catch { return null; }
    },

    isConnected() { return !!this.current(); },

    hasInjectedProvider,

    onChange(fn) { _walletListeners.add(fn); return () => _walletListeners.delete(fn); },

    /**
     * Connect a wallet. Uses an injected EIP-1193 provider (MetaMask, Rabby, Coinbase…)
     * when present; otherwise falls back to the browser-held ECDSA key unless
     * `{ allowBrowserKey: false }` is passed.
     */
    async connect({ allowBrowserKey = true } = {}) {
      if (hasInjectedProvider()) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || !accounts.length) throw new Error('No account authorised in wallet');
        const chainId = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
        return _setWallet({ address: accounts[0].toLowerCase(), type: 'eip1193', chainId, connectedAt: Date.now() });
      }
      if (!allowBrowserKey) throw new Error('No Ethereum wallet detected. Install MetaMask or another EIP-1193 wallet.');
      return _setWallet({ address: await _browserKeyAddress(), type: 'browser-key', chainId: null, connectedAt: Date.now() });
    },

    disconnect() { return _setWallet(null); },

    /** Sign a human-readable message with the connected wallet */
    async signMessage(message) {
      const wallet = this.current();
      if (!wallet) throw new Error('Wallet not connected');
      if (wallet.type === 'eip1193') {
        const hexMsg = '0x' + bytesToHex(enc.encode(message));
        return window.ethereum.request({ method: 'personal_sign', params: [hexMsg, wallet.address] });
      }
      const env = await signPayload({ message, address: wallet.address });
      return env.value;
    },

    /** EIP-4361 (Sign-In with Ethereum) style login */
    async signIn() {
      const wallet = await this.connect({ allowBrowserKey: false });
      const nonce = randomHex(16);
      const issuedAt = new Date().toISOString();
      const chain = wallet.chainId ? parseInt(wallet.chainId, 16) : 1;
      const message = `${location.host} wants you to sign in with your Ethereum account:\n${wallet.address}\n\n` +
        `Sign in to NF-Team.\n\nURI: ${location.origin}\nVersion: 1\nChain ID: ${chain}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
      const signature = await this.signMessage(message);
      return { wallet, message, signature, nonce, issuedAt };
    },
  };

  if (hasInjectedProvider() && typeof window.ethereum.on === 'function') {
    window.ethereum.on('accountsChanged', accounts => {
      const w = Wallet.current();
      if (!w || w.type !== 'eip1193') return;
      if (!accounts.length) _setWallet(null);
      else _setWallet({ ...w, address: accounts[0].toLowerCase() });
    });
  }

  return {
    escapeHTML, canonicalJSON, sha256Hex, randomHex,
    hashPassword, verifyPassword,
    getSigningKey, signPayload, verifyPayload, signToken, verifyToken, tokenSigningPayload,
    Wallet,
  };
})();

if (typeof window !== 'undefined') {
  window.NFSecurity = NFSecurity;
  window.escapeHTML = NFSecurity.escapeHTML;
}

export { NFSecurity };
