const { test, expect, openGallery, expectVisibleArtworks } = require('./helpers.cjs');

// Isolated examples test behavior, not today's artwork titles or media files.
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
const record = overrides => ({
  name: 'Example', path: '/media/artworks/example.png', time: '2030',
  category: 'Example series', material: 'Oil', size: '20×30cm', ...overrides,
});

test('editable text is not HTML and arbitrary category names can be filtered', async ({ page }) => {
  const sample = record({
    name: '\" <img src=x onerror="window.injected=true"> &',
    category: 'new series [a:b] # " <tag>',
    material: '<b>plain text</b>',
  });
  const records = [sample, record({ name: 'Another', path: '/media/artworks/another.png', category: 'Another series' })];
  await page.route('**/artwork.json', route => route.fulfill({ json: records }));
  await page.route('**/media/artworks/**', route => route.fulfill({ body: image, contentType: 'image/png' }));
  await openGallery(page, records);
  await page.getByRole('button', { name: sample.category, exact: true }).click();
  await expectVisibleArtworks(page, [sample]);
  await expect(page.locator('.grid-item script, .grid-item [onerror]')).toHaveCount(0);
  await page.locator('.grid-item:visible').click();
  await expect(page.locator('.artwork-title')).toHaveText(sample.name);
  await expect(page.locator('.artwork-material')).toContainText(sample.material);
  await expect(page.locator('.artwork-material b')).toHaveCount(0);
  await page.locator('.close-modal').click();
  await expect(page.locator('.art-modal')).toBeHidden();
});

test('empty content and failed requests have distinct valid states', async ({ page }) => {
  await page.route('**/artwork.json', route => route.fulfill({ json: [] }));
  await openGallery(page, []);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.unroute('**/artwork.json');
  await page.route('**/artwork.json', route => route.fulfill({ status: 503, body: '' }));
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible(); // Wording may change.
});
