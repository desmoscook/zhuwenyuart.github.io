const { test, expect, openPage, openGallery } = require('./helpers.cjs');
const manifest = require('./fixtures/extracted-assets.json');

for (const filename of Object.keys(manifest.pages)) {
  const url = filename === 'index.html' ? '/' : '/' + filename.replace('index.html', '');
  test(`external assets and runtime errors: ${url}`, async ({ page }, testInfo) => {
    const errors = [];
    const responses = [];
    const failedAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (pathname.startsWith('/assets/')) responses.push({ path: pathname, status: response.status() });
    });
    page.on('requestfailed', request => {
      if (new URL(request.url()).pathname.startsWith('/assets/')) failedAssets.push(request.url());
    });
    if (url === '/portfolios/') await openGallery(page);
    else await openPage(page, url);
    // IE-only conditional comments stay comments in Chromium. Their extracted
    // asset is checked on disk by structure.test.cjs, not executed by this browser.
    const expected = manifest.pages[filename].blocks
      .filter(block => block.originalId !== 'astra-flexibility-js-after')
      .map(block => '/' + block.asset);
    const activeReferences = await page.locator('script[src^="/assets/"], link[href^="/assets/"]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('src') || node.getAttribute('href')));
    expect(activeReferences).toEqual(expected);
    const expectedRuntimeErrors = url === '/portfolios/'
      ? ["Identifier 'lazyloadRunObserver' has already been declared"] : [];
    expect(errors).toEqual(expectedRuntimeErrors);
    expect(failedAssets).toEqual([]);
    for (const asset of expected) {
      expect(responses.some(response => response.path === asset && response.status === 200), asset).toBe(true);
    }
    await testInfo.attach('runtime-check', {
      body: JSON.stringify({ errors, externalAssets: responses, failedAssets }, null, 2),
      contentType: 'application/json',
    });
  });
}
