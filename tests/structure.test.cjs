const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const manifest = require('./fixtures/extracted-assets.json');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const blocks = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
const attr = (text, name) => text.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
const classicScript = attrs => !attr(attrs, 'src') &&
  (!attr(attrs, 'type') || ['text/javascript', 'application/javascript', 'module'].includes(attr(attrs, 'type')));

function original(filename) {
  return execFileSync('git', ['show', `${manifest.sourceCommit}:${filename}`], {
    cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
  });
}

for (const [filename, record] of Object.entries(manifest.pages)) {
  test(`${filename}: one body and no inline CSS or executable scripts`, () => {
    const html = fs.readFileSync(path.join(output, filename), 'utf8');
    assert.equal([...html.matchAll(/<body\b[^>]*>/gi)].length, 1);
    assert.equal([...html.matchAll(/<\/body\s*>/gi)].length, 1);
    assert.equal([...html.matchAll(/<style\b/gi)].length, 0);
    for (const match of html.matchAll(blocks)) {
      if (match[1].toLowerCase() === 'script') {
        assert.ok(!classicScript(match[2]), 'Executable inline script remains');
        if (!attr(match[2], 'src')) {
          assert.equal(attr(match[2], 'type'), 'speculationrules');
          assert.doesNotThrow(() => JSON.parse(match[3]));
        }
      }
    }
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*>/gi)]
      .map(match => attr(match[0], 'src') || attr(match[0], 'href'))
      .filter(ref => ref?.startsWith('/assets/'));
    assert.deepEqual(refs, record.blocks.map(block => '/' + block.asset));
    for (const ref of refs) assert.ok(fs.statSync(path.join(output, ref.slice(1))).isFile(), ref);
  });

  test(`${filename}: extracted bytes, body attributes and dependency order unchanged`, () => {
    // This migration-only check intentionally needs Git history. Future approved
    // content/behavior changes can retire or replace this migration fixture.
    const before = original(filename);
    const after = fs.readFileSync(path.join(output, filename), 'utf8');
    assert.equal(hash(before), record.originalSha256);
    // Shared templates can change formatting and attribute order. Browser DOM
    // equivalence for every element/attribute/text is checked separately in
    // templates.spec.cjs; don't pretend raw-string equality is still appropriate.
    const externalReferences = html => [...html.matchAll(/<(script|link)\b[^>]*>/gi)]
      .map(match => [match[1].toLowerCase(), attr(match[0], 'src') || attr(match[0], 'href')])
      .filter(([, ref]) => ref && !ref.startsWith('/assets/'));
    assert.deepEqual(externalReferences(after), externalReferences(before));
    const body = html => html.match(/<body\b[^>]*>/i)[0].replace(/\s+/g, ' ');
    assert.equal(body(after), body(before));
    const originalBlocks = [...before.matchAll(blocks)]
      .filter(match => (match[1].toLowerCase() === 'style' || classicScript(match[2])) && match[3].trim());
    assert.equal(originalBlocks.length, record.blocks.length);
    for (let i = 0; i < originalBlocks.length; i++) {
      const expected = record.blocks[i];
      const actual = fs.readFileSync(path.join(output, expected.asset), 'utf8');
      assert.equal(actual, originalBlocks[i][3], expected.asset);
      assert.equal(hash(actual), expected.sha256, expected.asset);
    }
  });
}

test('all extracted assets are present and syntax-valid', () => {
  for (const asset of manifest.assets) {
    const filename = path.join(root, 'src', asset.path);
    const bytes = fs.readFileSync(filename);
    assert.equal(bytes.length, asset.bytes, asset.path);
    assert.equal(hash(bytes), asset.sha256, asset.path);
    if (asset.path.endsWith('.js')) execFileSync(process.execPath, ['--check', filename], { stdio: 'pipe' });
  }
});

test('artwork data and primary images have not changed in this refactor', () => {
  const before = original('artwork.json');
  assert.equal(fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8'), before);
  const artworks = JSON.parse(before);
  assert.equal(artworks.length, 52);
  for (const art of artworks) assert.ok(fs.statSync(path.join(root, 'public', art.path)).isFile(), art.path);
});
