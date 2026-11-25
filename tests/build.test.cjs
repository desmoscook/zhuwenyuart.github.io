const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { root, pages, listFiles, validateContent, validateOutput } = require('../scripts/site-contract.cjs');
const baseline = require('./fixtures/template-baseline.json');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

function original(filename) {
  return execFileSync('git', ['show', `${baseline.sourceCommit}:${filename}`], { cwd: root, maxBuffer: 2 * 1024 * 1024 });
}

test('published inventory contains only generated pages and declared public resources', () => {
  const result = validateOutput(path.join(root, 'dist'));
  assert.equal(result.pages, 5);
  for (const excluded of ['src', 'content', 'tests', 'scripts', 'legacy', 'node_modules', 'image_origin', '.git']) {
    assert.equal(fs.existsSync(path.join(root, 'dist', excluded)), false, excluded);
  }
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/artwork.json')), fs.readFileSync(path.join(root, 'content/artwork.json')));
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/CNAME')), fs.readFileSync(path.join(root, 'public/CNAME')));
});

test('each public input is copied byte-for-byte to the same public URL', () => {
  for (const file of listFiles(path.join(root, 'public'))) {
    assert.equal(hash(fs.readFileSync(path.join(root, 'public', file))), hash(fs.readFileSync(path.join(root, 'dist', file))), file);
  }
  for (const file of listFiles(path.join(root, 'src/assets'))) {
    assert.equal(hash(fs.readFileSync(path.join(root, 'src/assets', file))), hash(fs.readFileSync(path.join(root, 'dist/assets', file))), file);
  }
});

test('templates are the only maintained main page source', () => {
  for (const filename of pages) {
    assert.equal(fs.existsSync(path.join(root, filename)), false, filename);
    assert.ok(fs.existsSync(path.join(root, 'src', filename.replace('.html', '.njk'))));
    assert.equal(hash(original(filename)), baseline.pages[filename], filename);
  }
  for (const filename of ['header.njk', 'footer.njk']) {
    assert.ok(fs.existsSync(path.join(root, 'src/_includes/components', filename)));
  }
  assert.equal(fs.existsSync(path.join(root, 'artwork.json')), false);
  assert.equal(fs.existsSync(path.join(root, 'image')), false);
});

test('content validation preserves all artworks and explicitly reports legacy missing detail paths', () => {
  const result = validateContent();
  assert.equal(result.artworks, 52);
  assert.equal(result.missingDetails.length, 12);
  assert.deepEqual(fs.readFileSync(path.join(root, 'content/artwork.json')), original('artwork.json'));
});

test('build input sources retain all original image and vendor file bytes', () => {
  const mappings = ['image/', 'wp-content/', 'wp-includes/', 'portfolios/css/', 'portfolios/js/'];
  const files = execFileSync('git', ['ls-tree', '-rz', baseline.sourceCommit, '--', ...mappings], { cwd: root }).toString().split('\0').filter(Boolean);
  for (const record of files) {
    const [metadata, oldPath] = record.split('\t');
    const originalBlob = metadata.split(' ')[2];
    const source = path.join(root, 'public', oldPath);
    assert.ok(fs.existsSync(source), oldPath);
    const bytes = fs.readFileSync(source);
    const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(blob, originalBlob, oldPath);
  }
});
