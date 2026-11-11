import { send, readJSON, rateLimited, aiStatus, clampText } from '../_lib.js';

const OPENAI = 'https://api.openai.com/v1';

async function openai(path, body) {
  const res = await fetch(`${OPENAI}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || `Provider error ${res.status}`);
    err.status = 502;
    throw err;
  }
  return data;
}

async function chat(system, user, { json = false, maxTokens = 300 } = {}) {
  const data = await openai('/chat/completions', {
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: maxTokens,
    temperature: 0.9,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  return data.choices?.[0]?.message?.content?.trim() || '';
}

const handlers = {
  async art(body) {
    const prompt = clampText(body.prompt, 500);
    if (!prompt) throw Object.assign(new Error('prompt is required'), { status: 400 });
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    const data = await openai('/images/generations', {
      model,
      prompt,
      size: '1024x1024',
      n: 1,
      ...(model.startsWith('dall-e') ? { response_format: 'b64_json' } : {}),
    });
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw Object.assign(new Error('Provider returned no image'), { status: 502 });
    return { image: `data:image/png;base64,${b64}` };
  },

  async story(body) {
    const text = clampText(body.text, 4000);
    const generated = await chat(
      `You are a co-writer. Continue the user's ${clampText(body.genre, 30) || 'fantasy'} story in a ${clampText(body.tone, 30) || 'epic'} tone. ` +
        'Write 2-4 sentences, keep names and facts consistent, no preamble.',
      text || 'Begin a new story.',
    );
    return { generated_text: generated };
  },

  async fusion(body) {
    const nfts = Array.isArray(body.nfts) ? body.nfts.slice(0, 6) : [];
    const max = Math.min(Number(body.max_suggestions) || 5, 8);
    const raw = await chat(
      'You suggest creative fusions of NFTs. Reply with JSON {"suggestions":[{"combination":string,"suggested_addition":string,' +
        '"confidence":number 0-1,"reasoning":string,"estimated_quality":number 0-100}]}.',
      `NFTs: ${JSON.stringify(nfts).slice(0, 3000)}. Give up to ${max} suggestions.`,
      { json: true, maxTokens: 500 },
    );
    const parsed = JSON.parse(raw || '{}');
    return { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, max) : [] };
  },
};

/** POST /api/ai/:kind — server-side proxy so provider keys never reach the browser */
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const kind = String(req.query?.kind || '').replace(/[^a-z0-9]/gi, '');
  // style-transfer-api posts to `${endpoint}/transfer`
  const normalised = kind === 'transfer' ? 'style' : kind;
  if (!aiStatus()[normalised] || !handlers[normalised]) {
    return send(res, 501, { error: `AI provider for "${normalised}" is not configured` });
  }
  if (rateLimited(req)) return send(res, 429, { error: 'Too many requests, slow down' });
  try {
    const body = await readJSON(req);
    return send(res, 200, await handlers[normalised](body));
  } catch (err) {
    return send(res, err.status || 500, { error: err.status ? err.message : 'Internal error' });
  }
}
