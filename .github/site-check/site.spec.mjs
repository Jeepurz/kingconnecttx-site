// kingconnecttx.com site check. Runs on every push (see .github/workflows/site-check.yml).
// Nothing here sends real data: analytics are blocked and the Google Form is answered by a stub.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const PAGES = [...new Set([
  ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname),
  '/privacy.html', '/terms.html',
])];

const SIZES = [
  { name: 'small phone', width: 320, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'laptop', width: 1440, height: 900 },
];

// Block analytics and stub the lead form so tests never touch real accounts.
test.beforeEach(async ({ context }) => {
  await context.route(/googletagmanager\.com|google-analytics\.com|doubleclick\.net|facebook\.(com|net)|clarity\.ms/, r => r.abort());
  await context.route(/docs\.google\.com\/forms/, r => r.fulfill({ status: 200, body: '' }));
});

async function openPage(page, url) {
  const errors = [];
  page.on('pageerror', e => errors.push(`script error: ${e.message}`));
  page.on('response', r => {
    const u = new URL(r.url());
    if (u.hostname === '127.0.0.1' && r.status() >= 400) errors.push(`${r.status()} ${u.pathname}`);
  });
  const res = await page.goto(url, { waitUntil: 'load' });
  expect(res?.status(), `${url} should load`).toBe(200);
  await page.waitForTimeout(400);
  return errors;
}

for (const size of SIZES) {
  test.describe(`${size.name} ${size.width}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    for (const url of PAGES) {
      test(`${url} loads cleanly and fits the screen`, async ({ page }) => {
        const errors = await openPage(page, url);
        await expect(page).toHaveTitle(/\S/);
        const h1 = page.locator('h1').first();
        await expect(h1, 'page has a visible headline').toBeVisible();
        const spill = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const out = [];
          for (const el of document.querySelectorAll('main *, header *, footer *, section *')) {
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') continue;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            // skip anything inside a box that deliberately scrolls or clips sideways
            let p = el.parentElement, clipped = false;
            while (p && p !== document.body) {
              const pc = getComputedStyle(p);
              if (/(auto|scroll|hidden|clip)/.test(pc.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= vw + 1 && pr.left >= -1) { clipped = true; break; } }
              p = p.parentElement;
            }
            if (clipped) continue;
            if (r.right > vw + 2 || r.left < -2) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 40)}"`);
          }
          return { pageWide: document.documentElement.scrollWidth > vw + 1, items: out.slice(0, 5) };
        });
        expect(spill.pageWide, `page scrolls sideways: ${spill.items.join(' | ')}`).toBe(false);
        expect(spill.items, 'nothing runs off the screen').toEqual([]);
        expect(errors, 'no script errors or missing files').toEqual([]);
      });
    }
  });
}

test('every link on every page goes somewhere real', async ({ page, request }) => {
  const broken = [];
  const checked = new Map();
  const idsOn = {};
  for (const url of PAGES) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    idsOn[url] = await page.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id));
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
    for (const href of hrefs) {
      if (/^(tel:|mailto:|sms:|javascript:)/.test(href) || /^https?:\/\/(?!kingconnecttx\.com)/.test(href)) continue;
      const u = new URL(href.replace(/^https?:\/\/kingconnecttx\.com/, ''), `http://127.0.0.1${url}`);
      const target = u.pathname;
      if (!checked.has(target)) {
        const r = await request.get(target);
        checked.set(target, r.status());
      }
      if (checked.get(target) !== 200) broken.push(`${url} → ${href} (${checked.get(target)})`);
      if (u.hash && u.hash.length > 1) broken.push({ from: url, page: target, id: decodeURIComponent(u.hash.slice(1)), href });
    }
  }
  // check #anchors against the ids on the page they point to
  const missing = [];
  for (const b of broken.filter(b => typeof b === 'object')) {
    let ids = idsOn[b.page];
    if (!ids) { await page.goto(b.page); ids = idsOn[b.page] = await page.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id)); }
    if (!ids.includes(b.id)) missing.push(`${b.from} → ${b.href} (no #${b.id})`);
  }
  expect([...broken.filter(b => typeof b === 'string'), ...missing]).toEqual([]);
});

test.describe('homepage', () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`main button is on the first screen at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await openPage(page, '/');
      await page.waitForTimeout(1200); // entrance finishes
      const btn = page.getByRole('link', { name: 'Book a free 15-minute check' });
      const box = await btn.boundingBox();
      expect(box && box.y + box.height <= vp.height, 'button fully visible without scrolling').toBe(true);
    });
  }

  test('lead form sends and confirms', async ({ page }) => {
    let sent = null;
    await page.route(/docs\.google\.com\/forms/, r => { sent = r.request().postData(); return r.fulfill({ status: 200, body: '' }); });
    await openPage(page, '/');
    await page.fill('#f-name', 'Site Check');
    await page.fill('#f-biz', 'Automated Test (ignore)');
    await page.fill('#f-phone', '9035550100');
    await page.locator('#f-send').click();
    await expect(page.locator('#formMsg')).toContainText('Got it');
    expect(sent, 'form posted to the Google Form').toContain('Site+Check');
  });

  test('chat opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, '/');
    await page.mouse.wheel(0, 600);
    const btn = page.locator('.kcc-btn');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.getByRole('dialog', { name: 'King Connect chat' })).toBeVisible();
    await page.getByRole('button', { name: 'Close chat' }).click();
    await expect(page.getByRole('dialog', { name: 'King Connect chat' })).toBeHidden();
  });
});

test.describe('calculator', () => {
  const set = (page, id, v) => page.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);

  test('default numbers add up', async ({ page }) => {
    await openPage(page, '/calculator/');
    await set(page, 'calls', 6); await set(page, 'close', 4); await set(page, 'jobN', 350);
    // 6 calls a week x 40% x $350 x 52 weeks
    await expect(page.locator('#year')).toHaveText('$43,680');
    await expect(page.locator('#month')).toHaveText('$3,640');
    await expect(page.locator('#bigHint')).toBeHidden();
  });

  test('a huge job amount still fits on a small phone and shows the commission hint', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openPage(page, '/calculator/');
    await set(page, 'calls', 50); await set(page, 'close', 10); await set(page, 'jobN', 45000000);
    await expect(page.locator('#bigHint')).toBeVisible();
    const fits = await page.evaluate(() => ['year', 'month'].every(id => { const e = document.getElementById(id); return e.scrollWidth <= e.clientWidth + 1; }));
    expect(fits, 'totals are never cut off').toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
