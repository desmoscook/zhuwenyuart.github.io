const { test, expect, visualArtworks: artworks, useVisualData, openPage, openGallery, settle, selectFilter, prepareScreenshot } = require('./helpers.cjs');

test.beforeEach(async ({ page }) => { await useVisualData(page); });

const pages = [
  { slug: 'home', url: '/' },
  { slug: 'about', url: '/about/' },
  { slug: 'contact', url: '/contact/' },
  { slug: 'portfolio', url: '/portfolios/' },
];

async function loadDocumentImages(page) {
  await page.evaluate(async () => {
    // Pin responsive-image candidate selection before scrolling. Otherwise the
    // original about-page srcset can select a different-resolution photo under
    // load and create pixel differences even without source changes.
    const width = innerWidth;
    const images = [...document.images];
    for (const image of images) {
      const candidates = (image.getAttribute('srcset') || '').split(',')
        .map(value => value.trim().match(/^(.*?)\s+(\d+)w$/))
        .filter(Boolean).map(match => ({ src: match[1], width: Number(match[2]) }))
        .sort((a, b) => a.width - b.width);
      if (candidates.length && candidates.at(-1).width >= 1000) {
        const sizes = image.getAttribute('sizes') || '';
        const limit = Number(sizes.match(/,\s*(\d+)px\s*$/)?.[1]);
        const target = limit ? Math.min(width, limit) : width;
        const candidate = candidates.find(candidate => candidate.width >= target) || candidates.at(-1);
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = candidate.src;
      }
      image.loading = 'eager';
    }
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += innerHeight * 0.75) {
      scrollTo(0, y);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    scrollTo(0, 0);
  });
  await settle(page);
}

for (const viewport of [{ width: 1440, height: 1000, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }]) {
  for (const item of pages) {
    test(`visual ${viewport.name}: ${item.slug}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (item.slug === 'portfolio') await openGallery(page, artworks);
      else await openPage(page, item.url);
      await loadDocumentImages(page);
      await prepareScreenshot(page);
      await expect(page).toHaveScreenshot(`${item.slug}-${viewport.name}-full.png`, { fullPage: true });
      if (item.slug === 'portfolio') {
        await page.locator('.portfolio-container').evaluate(container => { container.scrollTop = container.scrollHeight; });
        await prepareScreenshot(page);
        await expect(page.locator('.portfolio-container')).toHaveScreenshot(`portfolio-${viewport.name}-end.png`);
      }
      if (viewport.name === 'mobile' && item.slug === 'home') {
        await page.locator('#ast-mobile-header .menu-toggle').click();
        await prepareScreenshot(page);
        await expect(page).toHaveScreenshot('home-mobile-menu.png');
      }
    });
  }
}

test('visual desktop: category, year and modal states', async ({ page }) => {
  await openGallery(page, artworks);
  await page.getByRole('button', { name: '七宗罪', exact: true }).click();
  await prepareScreenshot(page);
  await expect(page).toHaveScreenshot('portfolio-category.png', { fullPage: true });
  const art = artworks.find(art => art.category === '七宗罪');
  await page.getByRole('img', { name: art.name, exact: true }).click();
  await page.locator('.modal-image').evaluate(image => image.decode());
  await prepareScreenshot(page);
  await expect(page).toHaveScreenshot('portfolio-modal-desktop.png');
  await page.keyboard.press('Escape');
  await page.locator('.filter-slider').click();
  await page.getByRole('button', { name: '2025', exact: true }).click();
  await prepareScreenshot(page);
  await expect(page).toHaveScreenshot('portfolio-year.png', { fullPage: true });
});

test('visual mobile: year and modal states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGallery(page, artworks);
  await page.locator('.filter-slider').click();
  await selectFilter(page, 'time', '2025');
  await prepareScreenshot(page);
  await expect(page).toHaveScreenshot('portfolio-year-mobile.png', { fullPage: true });
  const art = artworks.find(art => art.time === '2025');
  await page.getByRole('img', { name: art.name, exact: true }).click();
  await page.locator('.modal-image').evaluate(image => image.decode());
  await prepareScreenshot(page);
  await expect(page).toHaveScreenshot('portfolio-modal-mobile.png');
});

for (const width of [767, 768, 769, 920, 921, 922]) {
  test(`visual breakpoint ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openGallery(page, artworks);
    await prepareScreenshot(page);
    await expect(page).toHaveScreenshot(`portfolio-width-${width}.png`);
  });
}
