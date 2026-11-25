const { test, expect } = require('./helpers.cjs');
const fs = require('node:fs');
const path = require('node:path');
const baseline = require('./fixtures/template-dom.json');
const migration = require('../scripts/media-migration.json');
const replacements = migration.files.map(file => ['/' + file.from, '/' + file.to]);
// Pre-existing typo in a small about-photo srcset candidate; this migration
// updates it to the existing, moved file. No image bytes or layout are changed.
replacements.push(['/wp-content/uploads/2025/04/zwy_-225x300.jpg', '/media/site/about/zwy_work-225x300.jpg']);
function migratedToken(value) {
  if (typeof value === 'string') {
    return replacements.reduce((text, [before, after]) => text.split(before).join(after), value);
  }
  if (!Array.isArray(value)) return value;
  const result = value.map(migratedToken);
  if (typeof result[0] === 'string' && Array.isArray(result[2]) && result[2].some(child => child?.[0] === 'script' && child[1]?.some(([name, val]) => name === 'src' && val === '/assets/js/portfolio/gallery.js'))) {
    const index = result[2].findIndex(child => child?.[0] === 'script' && child[1]?.some(([name, val]) => name === 'src' && val === '/assets/js/portfolio/gallery.js'));
    result[2].splice(index, 0, ['script', [['src', '/assets/js/portfolio/artwork-data.js']], []]);
  }
  return result;
}

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
    expect(tokens).toEqual(migratedToken(baseline.pages[filename]));
  });
}
