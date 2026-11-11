import { test, expect } from '@playwright/test';

const errorsFor = page => {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });
  // Serverless /api routes don't exist under `vite preview`; the client falls back gracefully
  page.on('response', r => {
    if (r.status() >= 400 && !new URL(r.url()).pathname.startsWith('/api/')) errors.push(`http ${r.status()}: ${r.url()}`);
  });
  return errors;
};

async function signUp(page, name = 'e2e_user') {
  await page.goto('/login.html');
  await page.click('#tab-signup');
  await page.fill('#signup-username', name);
  await page.fill('#signup-email', `${name}@example.com`);
  await page.fill('#signup-password', 'supersecret1');
  await page.fill('#signup-confirm', 'supersecret1');
  await page.check('#agree-terms');
  await page.click('#btn-signup');
  await page.waitForURL('**/index.html');
}

test('auth stores only hashed passwords and rejects wrong ones', async ({ page }) => {
  const errors = errorsFor(page);
  await signUp(page);
  const users = await page.evaluate(() => localStorage.getItem('nfteam_users'));
  expect(users).toContain('passwordHash');
  expect(users).not.toContain('supersecret1');

  await page.evaluate(() => localStorage.removeItem('nfteam_user'));
  await page.goto('/login.html');
  await expect(page.locator('#btn-google')).toBeDisabled();
  await page.fill('#signin-email', 'e2e_user@example.com');
  await page.fill('#signin-password', 'wrongpass1');
  await page.click('#btn-signin');
  await expect(page.locator('#login-error')).toHaveText('Incorrect email or password.');
  await page.fill('#signin-password', 'supersecret1');
  await page.click('#btn-signin');
  await page.waitForURL('**/index.html');
  expect(errors).toEqual([]);
});

test('studios generate, mint signed tokens with stored artwork, and gallery verifies them', async ({ page }) => {
  const errors = errorsFor(page);
  await signUp(page, 'studio_user');
  await page.goto('/create.html');

  await page.fill('#ai-art-prompt', 'neon city');
  await page.click('#btn-ai-art');
  await expect(page.locator('#toast-detail')).toContainText('neon city');
  await page.click('#btn-mint-canvas');
  await expect(page.locator('#toast-detail')).toContainText('ECDSA P-256');

  await page.click('.studio-tab[data-studio="story"]');
  await page.click('#story-content');
  await page.keyboard.type('Aria entered the Neon Tower.');
  await page.click('#btn-ai-continue');
  await expect(page.locator('#ai-suggestions .suggestion-item')).toHaveCount(3);
  await page.click('#btn-mint-story');
  await expect(page.locator('#toast-detail')).toContainText('story');

  await page.click('.studio-tab[data-studio="mesh"]');
  await page.fill('#ai-mesh-prompt', 'twisted knot');
  await page.click('#btn-ai-mesh');
  await expect(page.locator('#ai-mesh-viewport')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.selectOption('#mesh-export-format', 'obj');
  await page.click('#btn-mesh-export');
  expect((await download).suggestedFilename()).toBe('nfteam-model.obj');

  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('nf-team-tokens'))[0]);
  expect(token.contentType).toBe('image/png');
  expect(token.erc721.attributes).toContainEqual({ trait_type: 'Medium', value: 'image' });

  await page.goto('/gallery.html');
  await expect(page.locator('.verified-badge').first()).toHaveText('✔ Signature verified');
  await expect(page.locator('.nft-card-preview img')).toHaveCount(1);

  await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('nf-team-tokens'));
    t[0].metadata.title = 'tampered';
    t.push({ id: '0xevil', type: 'image', zone: 'neon-district', owner: 'x', metadata: { title: '<img id=pwn src=x onerror=alert(1)>', createdAt: Date.now() }, interactions: { views: 0, forks: 0, remixes: 0 } });
    localStorage.setItem('nf-team-tokens', JSON.stringify(t));
  });
  await page.reload();
  await expect(page.locator('.verified-badge', { hasText: '✖ Invalid signature' })).toHaveCount(1);
  await expect(page.locator('#pwn')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('market trades settle balances', async ({ page }) => {
  const errors = errorsFor(page);
  await signUp(page, 'trader');
  await page.goto('/market.html');
  await expect(page.locator('#wallet-balance')).toHaveText('100.00');
  await page.locator('#listings-grid button', { hasText: 'Buy' }).first().click();
  await expect(page.locator('#toast-title, #mint-toast strong')).toHaveText('Purchased!');
  await expect(page.locator('#wallet-balance')).not.toHaveText('100.00');
  await page.click('[data-panel="auctions"]');
  await page.locator('#auctions-grid input').first().fill('7');
  await page.locator('#auctions-grid button', { hasText: 'Bid' }).first().click();
  await expect(page.locator('#toast-detail')).toContainText('7 NFT');
  expect(errors).toEqual([]);
});

test('community posts are escaped and live rooms connect two tabs', async ({ page, context }) => {
  const errors = errorsFor(page);
  await signUp(page, 'social');
  await page.goto('/community.html');
  await page.fill('#post-content', 'hello <b id="inj">world</b>');
  await page.click('#form-post button');
  await expect(page.locator('.feed-content').first()).toHaveText('hello <b id="inj">world</b>');
  await expect(page.locator('#inj')).toHaveCount(0);

  await page.click('#btn-room-create');
  await expect(page.locator('#room-status')).toContainText('Live in room_');
  const code = await page.inputValue('#room-id-input');
  const tab2 = await context.newPage();
  await tab2.goto('/community.html');
  await tab2.fill('#room-id-input', code);
  await tab2.click('#btn-room-join');
  await tab2.fill('#chat-input', 'hi from tab 2');
  await tab2.click('#form-chat button');
  await expect(page.locator('#chat-log')).toContainText('hi from tab 2');
  expect(errors).toEqual([]);
});

test('every page loads without errors and logout works', async ({ page }) => {
  const errors = errorsFor(page);
  await signUp(page, 'visitor');
  for (const p of ['index', 'create', 'gallery', 'market', 'community', 'quests', 'profile']) {
    await page.goto(`/${p}.html`);
    await expect(page.locator('#main-nav')).toBeVisible();
  }
  await page.click('#nav-profile-btn');
  await page.click('#btn-logout');
  await page.waitForURL('**/login.html');
  expect(errors).toEqual([]);
});
