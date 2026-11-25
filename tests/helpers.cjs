const { test: base, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const artworks = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'artwork.json'), 'utf8'));

// Both old and new pages use the same offline font fallback. This avoids
// unstable Google Fonts responses and the existing localhost font references.
// These tests do not certify the real external font/analytics services.
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

async function openGallery(page) {
  await openPage(page, '/portfolios/');
  await expect(page.locator('.grid-item')).toHaveCount(artworks.length);
  // Warm up lazy images in the nested scrolling area, not just the document.
  await page.locator('.portfolio-container').evaluate(async container => {
    const images = [...container.querySelectorAll('img')];
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map(image => image.decode()));
  });
  await page.waitForFunction(() => !!window.jQuery?.('.grid').data('isotope'));
  await page.evaluate(() => window.jQuery('.grid').isotope('layout'));
  await settle(page);
}

async function renderedNames(page) {
  await settle(page);
  return page.locator('.grid-item').evaluateAll(items => items
    .filter(item => getComputedStyle(item).display !== 'none')
    .map(item => item.querySelector('img').alt));
}

async function expectNames(page, filter = () => true) {
  const expected = artworks.filter(filter).map(art => art.name);
  await expect.poll(() => renderedNames(page)).toEqual(expected);
}

async function prepareScreenshot(page) {
  await page.mouse.move(-1, -1);
  await settle(page);
}

module.exports = { test, expect, artworks, settle, openPage, openGallery, expectNames, prepareScreenshot };
