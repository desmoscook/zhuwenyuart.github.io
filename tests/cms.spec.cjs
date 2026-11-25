const { test, expect, visualArtworks, openGallery, expectNames, selectFilter } = require('./helpers.cjs');

function probe(overrides = {}) {
  return {
    ...visualArtworks[0],
    name: 'CMS probe',
    time: '2030',
    category: '新 系列 [a:b] # " & <分类>',
    material: '材料 " <b>不是 HTML</b>',
    size: '尺寸 & <span>20×30cm</span>',
    des: '',
    ...overrides,
  };
}

async function catalog(page, records) {
  await page.route('**/artwork.json', route => route.fulfill({ json: records }));
  await openGallery(page, records);
}

test('CMS catalog edits, insertion and deletion render without frozen counts', async ({ page }) => {
  const extra = probe({ path: visualArtworks[1].path });
  const initial = [visualArtworks[0], extra];
  await catalog(page, initial);
  await expectNames(page, () => true, initial);
  const modified = [probe({ name: 'Updated title', path: visualArtworks[1].path })];
  await page.unroute('**/artwork.json');
  await catalog(page, modified);
  await expectNames(page, () => true, modified);
  await expect(page.locator('.grid-item img')).toHaveAttribute('alt', 'Updated title');
});

test('artwork text remains text, and selectors never contain category input', async ({ page }) => {
  const name = '" \' <img src=x onerror="window.__injected=true"> & <script>bad()</script>';
  const art = probe({ name });
  await page.addInitScript(() => { window.__injected = false; });
  await catalog(page, [art]);
  await expect(page.locator('.portfolio-title3 a')).toHaveText(name);
  await expect(page.locator('.grid-item')).toHaveCount(1);
  await expect(page.locator('.grid-item img')).toHaveCount(1);
  await expect(page.locator('.grid-item script')).toHaveCount(0);
  expect(await page.evaluate(() => window.__injected)).toBe(false);
  await page.getByRole('button', { name: art.category, exact: true }).click();
  await expectNames(page, () => true, [art]);
  await page.locator('.grid-item img').click();
  await expect(page.locator('.artwork-title')).toHaveText(name);
  await expect(page.locator('.artwork-material')).toHaveText('材料: ' + art.material);
  await expect(page.locator('.artwork-material b')).toHaveCount(0);
  await expect(page.locator('.artwork-size span')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await selectFilter(page, 'category', art.category);
  await expectNames(page, () => true, [art]);
});

test('empty catalog is a valid site state, including both filter modes', async ({ page }) => {
  await catalog(page, []);
  await expect(page.locator('.grid-item')).toHaveCount(0);
  await page.locator('.filter-slider').click();
  await expect(page.locator('.pc-filter .time-group button')).toHaveCount(1);
  await page.locator('.filter-slider').click();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
});

test('failed JSON request shows an error rather than a blank unexplained gallery', async ({ page }) => {
  await page.route('**/artwork.json', route => route.fulfill({ status: 503, body: 'temporarily unavailable' }));
  await page.goto('/portfolios/');
  await expect(page.getByRole('alert')).toHaveText('作品暂时无法加载，请稍后刷新重试。');
});

test('off-site and non-artwork image URLs are rejected before insertion', async ({ page }) => {
  await page.route('**/artwork.json', route => route.fulfill({ json: [probe({ path: 'https://example.com/private.png' })] }));
  await page.goto('/portfolios/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.grid-item img')).toHaveCount(0);
});

test('filtering initializes before an unfinished artwork image', async ({ page }) => {
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const art = probe();
  await page.route('**/artwork.json', route => route.fulfill({ json: [art] }));
  await page.route('**' + encodeURI(art.path), async route => { await gate; await route.continue(); });
  try {
    await page.goto('/portfolios/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.jQuery?.('.grid').data('isotope'));
    await page.getByRole('button', { name: art.category, exact: true }).click();
    await expect(page.locator('.pc-filter .category-group button.active')).toHaveText(art.category);
  } finally {
    finish();
  }
});
