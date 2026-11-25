const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateArtworks } = require('../src/assets/js/portfolio/artwork-data.js');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const pages = ['index.html', 'about/index.html', 'contact/index.html', 'portfolios/index.html'];
const blocks = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
const attr = (text, name) => text.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];

for (const filename of pages) {
  test(`${filename}: one body, no inline CSS/executable scripts and real local resources`, () => {
    const html = fs.readFileSync(path.join(output, filename), 'utf8');
    assert.equal([...html.matchAll(/<body\b[^>]*>/gi)].length, 1);
    assert.equal([...html.matchAll(/<\/body\s*>/gi)].length, 1);
    assert.equal([...html.matchAll(/<style\b/gi)].length, 0);
    for (const match of html.matchAll(blocks)) {
      if (match[1].toLowerCase() !== 'script') continue;
      if (!attr(match[2], 'src')) {
        assert.equal(attr(match[2], 'type'), 'speculationrules');
        assert.doesNotThrow(() => JSON.parse(match[3]));
      }
    }
    const references = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(script|link)\b[^>]*>/gi)];
    for (const [tag] of references) {
      const ref = attr(tag, 'src') || (attr(tag, 'rel') === 'stylesheet' ? attr(tag, 'href') : undefined);
      if (!ref || /^(?:[a-z]+:)?\/\//i.test(ref)) continue;
      const pathname = decodeURIComponent(ref.split(/[?#]/)[0]);
      const file = pathname.startsWith('/') ? path.join(output, pathname.slice(1)) : path.join(output, path.dirname(filename), pathname);
      assert.ok(fs.statSync(file).isFile(), `${filename}: ${ref}`);
    }
  });
}

test('all maintained browser scripts are syntax-valid', () => {
  for (const file of fs.readdirSync(path.join(root, 'src/assets/js'), { recursive: true })) {
    if (file.endsWith('.js')) execFileSync(process.execPath, ['--check', path.join(root, 'src/assets/js', file)], { stdio: 'pipe' });
  }
});

test('current content, not a frozen migration catalog, is published unchanged', () => {
  const source = fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'artwork.json'), 'utf8')), JSON.parse(source));
  const artworks = validateArtworks(JSON.parse(source));
  for (const art of artworks) assert.ok(fs.statSync(path.join(root, 'public', art.path.slice(1))).isFile(), art.path);
});
