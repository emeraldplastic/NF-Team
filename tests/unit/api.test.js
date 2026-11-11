import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import statusHandler from '../../api/status.js';
import aiHandler from '../../api/ai/[kind].js';
import pinHandler from '../../api/ipfs/pin.js';

function mockRes() {
  const res = { statusCode: 0, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = data => { res.body = JSON.parse(data); };
  return res;
}
const req = (method, { query = {}, body = {}, ip = '1.1.1.1' } = {}) => ({ method, query, body, headers: { 'x-forwarded-for': ip } });

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.PINATA_JWT;
});
afterEach(() => vi.unstubAllGlobals());

describe('/api/status', () => {
  it('reports integrations without exposing secrets', () => {
    process.env.OPENAI_API_KEY = 'sk-secret';
    const res = mockRes();
    statusHandler(req('GET'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ai).toMatchObject({ art: true, story: true, music: false });
    expect(res.body.ipfs).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('sk-secret');
  });
});

describe('/api/ai/:kind', () => {
  it('returns 501 when the provider is not configured', async () => {
    const res = mockRes();
    await aiHandler(req('POST', { query: { kind: 'art' }, body: { prompt: 'x' } }), res);
    expect(res.statusCode).toBe(501);
  });

  it('rejects non-POST requests', async () => {
    const res = mockRes();
    await aiHandler(req('GET', { query: { kind: 'art' } }), res);
    expect(res.statusCode).toBe(405);
  });

  it('proxies story continuation to OpenAI with the server key', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'And then…' } }] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await aiHandler(req('POST', { query: { kind: 'story' }, body: { text: 'Once', genre: 'scifi' }, ip: '2.2.2.2' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.generated_text).toBe('And then…');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-test');
  });

  it('returns a data URL for art', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: [{ b64_json: 'AAAA' }] }) })));
    const res = mockRes();
    await aiHandler(req('POST', { query: { kind: 'art' }, body: { prompt: 'neon' }, ip: '3.3.3.3' }), res);
    expect(res.body.image).toBe('data:image/png;base64,AAAA');
  });

  it('maps provider failures to 502 without leaking internals', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'bad key' } }) })));
    const res = mockRes();
    await aiHandler(req('POST', { query: { kind: 'story' }, body: { text: 'x' }, ip: '4.4.4.4' }), res);
    expect(res.statusCode).toBe(502);
  });

  it('rate-limits bursts from one IP', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) })));
    let last;
    for (let i = 0; i < 22; i++) {
      last = mockRes();
      await aiHandler(req('POST', { query: { kind: 'story' }, body: { text: 'x' }, ip: '9.9.9.9' }), last);
    }
    expect(last.statusCode).toBe(429);
  });
});

describe('/api/ipfs/pin', () => {
  it('returns 501 without PINATA_JWT', async () => {
    const res = mockRes();
    await pinHandler(req('POST', { body: { content: 'aGk=' } }), res);
    expect(res.statusCode).toBe(501);
  });

  it('pins the file then metadata pointing at it', async () => {
    process.env.PINATA_JWT = 'jwt';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ IpfsHash: 'bafyFile' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ IpfsHash: 'bafyMeta' }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await pinHandler(req('POST', { body: { name: 'Art', mime: 'image/png', content: 'aGk=', metadata: { name: 'Art' } }, ip: '5.5.5.5' }), res);
    expect(res.body).toEqual({ cid: 'bafyFile', metadataCid: 'bafyMeta' });
    const metaBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(metaBody.pinataContent.image).toBe('ipfs://bafyFile');
  });
});
