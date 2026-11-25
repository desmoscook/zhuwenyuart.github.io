const { test, expect, artworks, openPage, openGallery, expectNames, settle } = require('./helpers.cjs');

const pages = [
  { url: '/', title: 'Home' },
  { url: '/about/', title: 'About' },
  { url: '/portfolios/', title: 'Portfolio' },
  { url: '/contact/', title: 'Contact' },
];

for (const item of pages) {
  test(`page and navigation: ${item.url}`, async ({ page }) => {
    await openPage(page, item.url);
    await expect(page).toHaveTitle(item.title);
    await expect(page.locator('body')).toHaveCount(1);
    const nav = page.getByRole('navigation', { name: 'Site Navigation: Primary', exact: true });
    await expect(nav).toBeVisible();
    expect(await nav.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))))
      .toEqual(['/', '/about/', '/portfolios/', '/contact/']);
    await nav.getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveURL(/\/about\/$/);
  });
}

test('desktop: every series, year and filter reset preserves artwork order', async ({ page }) => {
  await openGallery(page);
  await expectNames(page);
  const categories = [...new Set(artworks.map(art => art.category))];
  for (const category of categories) {
    await page.locator('.pc-filter .category-group').getByRole('button', { name: category, exact: true }).click();
    await expectNames(page, art => art.category === category);
  }
  await page.locator('.filter-slider').click();
  await expectNames(page);
  const years = [...new Set(artworks.map(art => art.time))].sort().reverse();
  for (const year of years) {
    await page.locator('.pc-filter .time-group').getByRole('button', { name: year, exact: true }).click();
    await expectNames(page, art => art.time === year);
  }
  await page.locator('.filter-slider').click();
  await expectNames(page);
  await expect(page.locator('.pc-filter .category-group button.active')).toHaveText('全部作品');
});

test('modal: correct artwork and all three existing close methods', async ({ page }) => {
  await openGallery(page);
  const category = '七宗罪';
  await page.locator('.pc-filter .category-group').getByRole('button', { name: category, exact: true }).click();
  await expectNames(page, art => art.category === category);
  const art = artworks.find(art => art.category === category);
  const card = page.getByRole('img', { name: art.name, exact: true });
  const modal = page.locator('.art-modal');
  for (const method of ['button', 'backdrop', 'escape']) {
    await card.click();
    await expect(modal).toBeVisible();
    await expect(modal.locator('.artwork-title')).toHaveText(art.name);
    await expect(modal.locator('.modal-image')).toHaveAttribute('src', `../${art.path}`);
    await expect(modal.locator('.artwork-time')).toContainText(art.time);
    await expect(modal.locator('.artwork-material')).toContainText(art.material);
    await expect(modal.locator('.artwork-size')).toContainText(art.size);
    if (method === 'button') await modal.locator('.close-modal').click();
    else if (method === 'backdrop') await modal.click({ position: { x: 5, y: 5 } });
    else await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expectNames(page, art => art.category === category);
  }
});

test('mobile: all dropdown filters and mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGallery(page);
  await expect(page.locator('.mobile-filter')).toBeVisible();
  await expect(page.locator('.pc-filter')).toBeHidden();
  for (const category of new Set(artworks.map(art => art.category))) {
    await page.locator('.mobile-filter .category-group select').selectOption(`.category-${category}`);
    await expectNames(page, art => art.category === category);
  }
  await page.locator('.filter-slider').click();
  await expectNames(page);
  for (const year of new Set(artworks.map(art => art.time))) {
    await page.locator('.mobile-filter .time-group select').selectOption(`.time-${year}`);
    await expectNames(page, art => art.time === year);
  }
  const toggle = page.locator('#ast-mobile-header .menu-toggle');
  await toggle.click();
  const nav = page.locator('#ast-mobile-site-navigation');
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contact\/$/);
  await settle(page);
  await expect(page.locator('main')).toContainText('zhuwenyu-art@outlook.com');
});

for (const width of [767, 768, 769, 920, 921, 922]) {
  test(`responsive boundary at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openGallery(page);
    if (width <= 768) {
      await expect(page.locator('.mobile-filter')).toBeVisible();
      await expect(page.locator('.pc-filter')).toBeHidden();
    } else {
      await expect(page.locator('.pc-filter')).toBeVisible();
      await expect(page.locator('.mobile-filter')).toBeHidden();
    }
    if (width <= 921) await expect(page.locator('#ast-mobile-header .menu-toggle')).toBeVisible();
    else await expect(page.getByRole('navigation', { name: 'Site Navigation: Primary', exact: true })).toBeVisible();
  });
}
