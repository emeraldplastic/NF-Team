/* ══════════════════════════════════════════════════════════════
   NF-Team — Asset store
   Persists the actual artwork behind each token in IndexedDB, keyed
   by its SHA-256 content hash, and builds ERC-721 metadata.
   ══════════════════════════════════════════════════════════════ */

const DB_NAME = 'nfteam-assets';
const STORE = 'assets';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'hash' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** Normalise studio output (data URL, string or Blob) into bytes + mime */
export async function toBytes(content, mime = 'text/plain') {
  if (typeof Blob !== 'undefined' && content instanceof Blob) {
    return { bytes: new Uint8Array(await content.arrayBuffer()), mime: content.type || mime };
  }
  const str = String(content ?? '');
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(str);
  if (m) {
    const bytes = m[2]
      ? Uint8Array.from(atob(m[3]), c => c.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(m[3]));
    return { bytes, mime: m[1] };
  }
  return { bytes: new TextEncoder().encode(str), mime };
}

export async function putAsset(content, mime) {
  const { bytes, mime: type } = await toBytes(content, mime);
  const hash = await sha256Hex(bytes);
  await tx('readwrite', store => store.put({ hash, mime: type, size: bytes.byteLength, data: bytes, createdAt: Date.now() }));
  return { hash, mime: type, size: bytes.byteLength, bytes };
}

export async function getAsset(hash) {
  if (!hash) return null;
  return (await tx('readonly', store => store.get(hash))) || null;
}

export async function getAssetURL(hash) {
  const asset = await getAsset(hash);
  if (!asset) return null;
  return URL.createObjectURL(new Blob([asset.data], { type: asset.mime }));
}

export async function deleteAsset(hash) {
  await tx('readwrite', store => store.delete(hash));
}

/** ERC-721 / OpenSea-style metadata for a token */
export function buildMetadata(token, { imageURI, animationURI } = {}) {
  const title = token.metadata && token.metadata.title;
  const zone = String(token.zone || '').replace(/-/g, ' ');
  return {
    name: title,
    description: `${token.type} NFT created in ${zone} on NF-Team`,
    image: imageURI || null,
    animation_url: animationURI || null,
    external_url: null,
    attributes: [
      { trait_type: 'Medium', value: token.type },
      { trait_type: 'Zone', value: zone },
      ...(token.parents ? [{ trait_type: 'Fusion parents', value: token.parents.length }] : []),
    ],
    properties: {
      contentHash: token.contentHash,
      creator: token.creator,
      createdAt: token.metadata && token.metadata.createdAt,
    },
  };
}

export const NFAssets = { putAsset, getAsset, getAssetURL, deleteAsset, buildMetadata, toBytes };
if (typeof window !== 'undefined') window.NFAssets = NFAssets;
export default NFAssets;
