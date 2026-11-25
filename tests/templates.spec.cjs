const { test, expect } = require('./helpers.cjs');
const fs = require('node:fs');
const path = require('node:path');
const baseline = require('./fixtures/template-dom.json');

for (const filename of Object.keys(baseline.pages)) {
  test(`generated DOM matches the first refactor: ${filename}`, async ({ page }) => {
    const after = fs.readFileSync(path.join(__dirname, '..', 'dist', filename), 'utf8');
    // Parse without script execution or network access. Compare all elements,
    // attributes and meaningful text; ignore only formatting whitespace/comments.
    const tokens = await page.evaluate(source => {
      const document = new DOMParser().parseFromString(source, 'text/html');
      function visit(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\s+/g, ' ').trim();
          return text ? ['text', text] : null;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        const attributes = [...node.attributes].map(attribute => [attribute.name, attribute.value.replace(/\s+/g, ' ')]).sort((a, b) => a[0].localeCompare(b[0]));
        return [node.tagName.toLowerCase(), attributes, [...node.childNodes].map(visit).filter(Boolean)];
      }
      return visit(document.documentElement);
    }, after);
    expect(tokens).toEqual(baseline.pages[filename]);
  });
}
