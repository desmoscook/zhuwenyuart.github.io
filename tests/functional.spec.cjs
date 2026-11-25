const { test, expect, artworks, openGallery, expectVisibleArtworks, selectFilter } = require('./helpers.cjs');

test('desktop gallery: representative filters and artwork details remain usable', async ({ page }) => {
  await openGallery(page);
  await expectVisibleArtworks(page, artworks);
  if (!artworks.length) return; // An empty catalog is an allowed content state.

  const sample = artworks[0];
  await page.locator('.pc-filter .category-group').getByRole('button', { name: sample.category, exact: true }).click();
  await expectVisibleArtworks(page, artworks.filter(art => art.category === sample.category));
  await page.locator('.filter-slider').click();
  await page.locator('.pc-filter .time-group').getByRole('button', { name: sample.time, exact: true }).click();
  await expectVisibleArtworks(page, artworks.filter(art => art.time === sample.time));

  const card = page.locator('.grid-item:visible').first();
  const source = await card.locator('img').getAttribute('src');
  const selected = artworks.find(art => art.path === source || '/' + art.path === source);
  expect(selected).toBeDefined();
  await card.click();
  const modal = page.locator('.art-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.artwork-title')).toHaveText(selected.name);
  await expect(modal.locator('.modal-image')).toHaveAttribute('src', source);
  await expect(modal.locator('.artwork-time')).toContainText(selected.time);
  await expect(modal.locator('.artwork-material')).toContainText(selected.material);
  await expect(modal.locator('.artwork-size')).toContainText(selected.size);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('mobile gallery: one dropdown filter and a real navigation destination work', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGallery(page);
  await expect(page.locator('.mobile-filter')).toBeVisible();
  if (artworks.length) {
    const category = artworks[0].category;
    await selectFilter(page, 'category', category);
    await expectVisibleArtworks(page, artworks.filter(art => art.category === category));
  }
  await page.locator('#ast-mobile-header .menu-toggle').click();
  const nav = page.locator('#ast-mobile-site-navigation');
  await expect(nav).toBeVisible();
  const link = nav.locator('a[href]').first();
  const destination = new URL(await link.getAttribute('href'), baseURL).href;
  await link.click();
  await expect(page).toHaveURL(destination);
  await expect(page.locator('main')).toBeVisible();
});
