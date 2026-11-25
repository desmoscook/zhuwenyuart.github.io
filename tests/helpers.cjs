const { test: base, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const migration = require('../scripts/media-migration.json');
const visualImageCache = new Map();
const { validateArtworks } = require('../src/assets/js/portfolio/artwork-data.js');

const artworks = validateArtworks(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'artwork.json'), 'utf8')));
const visualArtworks = validateArtworks(require('./fixtures/artworks.json'));

// Old and new pages use the same offline font fallback. External font/analytics
// availability is a separate concern, not a reason to change visual baselines.
const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:18765') return route.continue();
      return route.abort('blockedbyclient');
    });
    await page.addInitScript(() => { window.Worker = undefined; });
    await use(page);
  },
});

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.complete)
      .map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function openPage(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await settle(page);
}

async function openGallery(page, expected = artworks) {
  await openPage(page, '/portfolios/');
  await expect(page.locator('.grid-item')).toHaveCount(expected.length);
  await page.waitForFunction(() => !!window.jQuery?.('.grid').data('isotope'));
  await page.locator('.portfolio-container').evaluate(async container => {
    const images = [...container.querySelectorAll('img')];
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map(image => image.decode()));
  });
  await page.evaluate(() => window.jQuery('.grid').isotope('layout'));
  await settle(page);
}

async function useVisualData(page) {
  await page.route('**/artwork.json', route => route.fulfill({ json: visualArtworks }));
  // A CMS editor may replace/delete real artwork files. Keep layout screenshots
  // tied to immutable pre-CMS bytes, and test the live catalog separately.
  await page.route('**/media/artworks/**', async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
    const original = migration.files.find(file => file.to === pathname && file.kind === 'artwork');
    if (!original) return route.continue();
    if (!visualImageCache.has(pathname)) {
      visualImageCache.set(pathname, execFileSync('git', ['show', `${migration.sourceCommit}:public/${original.from}`], {
        cwd: path.join(__dirname, '..'), maxBuffer: 10 * 1024 * 1024,
      }));
    }
    const type = pathname.endsWith('.png') ? 'image/png' : pathname.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    await route.fulfill({ body: visualImageCache.get(pathname), contentType: type });
  });
}

async function renderedNames(page) {
  await settle(page);
  return page.locator('.grid-item').evaluateAll(items => items
    .filter(item => getComputedStyle(item).display !== 'none')
    .map(item => item.querySelector('img').alt));
}

async function expectNames(page, filter = () => true, source = artworks) {
  await expect.poll(() => renderedNames(page)).toEqual(source.filter(filter).map(art => art.name));
}

async function selectFilter(page, type, label) {
  const select = page.locator(`.mobile-filter .${type}-group select`);
  const option = select.locator('option').filter({ hasText: label });
  const value = await option.evaluateAll((options, label) => options.find(option => option.textContent === label)?.value, label);
  if (value === undefined) throw new Error(`Missing ${type} filter: ${label}`);
  await select.selectOption(value);
}

async function prepareScreenshot(page) {
  await page.mouse.move(-1, -1);
  await settle(page);
}

module.exports = { test, expect, artworks, visualArtworks, useVisualData, settle, openPage, openGallery, expectNames, selectFilter, prepareScreenshot };
