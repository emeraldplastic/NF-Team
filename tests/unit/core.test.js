import { describe, it, expect, vi } from 'vitest';
import { NFStorage } from '../../src/core/storage.js';
import { EventBus, Events } from '../../src/core/events.js';
import { Store } from '../../src/core/store.js';
import { buildMetadata, putAsset, getAsset, toBytes } from '../../src/core/asset-store.js';

describe('NFStorage', () => {
  it('round-trips JSON and notifies subscribers', () => {
    const fn = vi.fn();
    const off = NFStorage.subscribe(fn);
    NFStorage.setJSON('k', { a: 1 });
    expect(NFStorage.getJSON('k')).toEqual({ a: 1 });
    expect(fn).toHaveBeenCalledWith('k', '{"a":1}', 'local');
    off();
    NFStorage.removeItem('k');
    expect(NFStorage.getJSON('k', 'fallback')).toBe('fallback');
  });

  it('returns the fallback for corrupt JSON', () => {
    NFStorage.setItem('bad', '{nope');
    expect(NFStorage.getJSON('bad', [])).toEqual([]);
  });
});

describe('EventBus', () => {
  it('supports exact, once and wildcard listeners', () => {
    const exact = vi.fn(), once = vi.fn(), wild = vi.fn();
    const off = EventBus.on(Events.ZONE_CHANGED, exact);
    EventBus.once(Events.ZONE_CHANGED, once);
    EventBus.on('zone:*', wild);
    EventBus.emit(Events.ZONE_CHANGED, { zone: 'x' });
    EventBus.emit(Events.ZONE_CHANGED, { zone: 'y' });
    expect(exact).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
    expect(wild).toHaveBeenCalledTimes(2);
    off();
    EventBus.emit(Events.ZONE_CHANGED, {});
    expect(exact).toHaveBeenCalledTimes(2);
  });

  it('defines the events the app emits', () => {
    expect(Events.NOTIFICATION_SHOW).toBeTruthy();
    expect(Events.STUDIO_TAB_CHANGED).toBeTruthy();
    expect(Events.NFT_MINTED).toBeTruthy();
  });
});

describe('Store', () => {
  it('notifies path subscribers and persists tokens through NFStorage', () => {
    const fn = vi.fn();
    const off = Store.subscribe('tokens', fn);
    Store.set('tokens', [{ id: '1' }]);
    expect(fn).toHaveBeenCalled();
    expect(NFStorage.getJSON('nf-team-tokens')).toEqual([{ id: '1' }]);
    expect(Store.get('tokens')).toEqual([{ id: '1' }]);
    off();
  });

  it('returns copies, not live references', () => {
    Store.set('wallet', { address: '0x1' });
    const w = Store.get('wallet');
    w.address = 'mutated';
    expect(Store.get('wallet').address).toBe('0x1');
  });
});

describe('asset store', () => {
  it('decodes data URLs and stores content by hash', async () => {
    const { mime, bytes } = await toBytes('data:text/plain;base64,aGVsbG8=');
    expect(mime).toBe('text/plain');
    expect(new TextDecoder().decode(bytes)).toBe('hello');
    const saved = await putAsset('data:text/plain;base64,aGVsbG8=');
    expect(saved.hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    const loaded = await getAsset(saved.hash);
    expect(loaded.mime).toBe('text/plain');
    expect(loaded.size).toBe(5);
  });

  it('builds ERC-721 metadata', () => {
    const meta = buildMetadata({ type: 'image', zone: 'pixel-forest', contentHash: 'h', creator: '0xc', metadata: { title: 'T', createdAt: 1 } }, { imageURI: 'ipfs://cid' });
    expect(meta).toMatchObject({ name: 'T', image: 'ipfs://cid' });
    expect(meta.attributes).toContainEqual({ trait_type: 'Zone', value: 'pixel forest' });
    expect(meta.properties.contentHash).toBe('h');
  });
});
