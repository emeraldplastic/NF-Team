import { describe, it, expect, beforeAll } from 'vitest';

let NFSecurity;
beforeAll(async () => {
  ({ NFSecurity } = await import('../../src/core/security.js'));
});

describe('escapeHTML', () => {
  it('neutralises markup and quotes', () => {
    expect(NFSecurity.escapeHTML('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(NFSecurity.escapeHTML("it's `x` & y")).toBe('it&#39;s &#96;x&#96; &amp; y');
    expect(NFSecurity.escapeHTML(null)).toBe('');
  });
});

describe('canonicalJSON', () => {
  it('is independent of key order and drops undefined', () => {
    expect(NFSecurity.canonicalJSON({ b: 1, a: [2, { d: 1, c: undefined }] })).toBe('{"a":[2,{"d":1}],"b":1}');
    expect(NFSecurity.canonicalJSON({ a: 1, b: 2 })).toBe(NFSecurity.canonicalJSON({ b: 2, a: 1 }));
  });
});

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const record = await NFSecurity.hashPassword('correct horse', undefined, 1000);
    expect(record.algo).toBe('PBKDF2-SHA256');
    expect(record.hash).not.toContain('correct');
    expect(await NFSecurity.verifyPassword('correct horse', record)).toBe(true);
    expect(await NFSecurity.verifyPassword('wrong horse', record)).toBe(false);
  });

  it('uses a random salt per hash', async () => {
    const a = await NFSecurity.hashPassword('same', undefined, 1000);
    const b = await NFSecurity.hashPassword('same', undefined, 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('token signatures', () => {
  const token = () => ({
    id: '0xabc', type: 'image', zone: 'neon-district', owner: '0xowner', creator: '0xowner',
    contentHash: 'deadbeef', metadata: { title: 'Test', createdAt: 1700000000000 },
  });

  it('signs and verifies a token', async () => {
    const t = token();
    t.signature = await NFSecurity.signToken(t);
    expect(t.signature.alg).toBe('ES256');
    expect(await NFSecurity.verifyToken(t)).toBe(true);
  });

  it('detects tampering with any signed field', async () => {
    const t = token();
    t.signature = await NFSecurity.signToken(t);
    for (const mutate of [x => { x.metadata.title = 'Evil'; }, x => { x.owner = '0xthief'; }, x => { x.contentHash = 'other'; }]) {
      const copy = structuredClone(t);
      mutate(copy);
      expect(await NFSecurity.verifyToken(copy)).toBe(false);
    }
  });

  it('rejects missing or malformed signatures', async () => {
    expect(await NFSecurity.verifyToken(token())).toBe(false);
    expect(await NFSecurity.verifyToken({ ...token(), signature: { alg: 'ES256', value: 'xx', publicKey: {} } })).toBe(false);
  });
});

describe('browser-key wallet', () => {
  it('connects with an address derived from the signing key and disconnects', async () => {
    const w = await NFSecurity.Wallet.connect();
    expect(w.type).toBe('browser-key');
    expect(w.address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(NFSecurity.Wallet.current().address).toBe(w.address);
    const again = await NFSecurity.Wallet.connect();
    expect(again.address).toBe(w.address);
    NFSecurity.Wallet.disconnect();
    expect(NFSecurity.Wallet.current()).toBeNull();
  });

  it('refuses SIWE sign-in without an injected provider', async () => {
    await expect(NFSecurity.Wallet.signIn()).rejects.toThrow(/No Ethereum wallet/);
  });
});
