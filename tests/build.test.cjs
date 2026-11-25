const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { root, pages, listFiles, validateContent, validateOutput } = require('../scripts/site-contract.cjs');
const { validateArtworks } = require('../src/assets/js/portfolio/artwork-data.js');
const { validateCmsConfig } = require('../scripts/cms-config.cjs');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

test('published inventory contains only pages and declared public resources', () => {
  const result = validateOutput(path.join(root, 'dist'));
  assert.equal(result.pages, 5);
  for (const excluded of ['src', 'content', 'tests', 'scripts', 'legacy', 'node_modules', 'image_origin', '.git', '.pages.yml']) {
    assert.equal(fs.existsSync(path.join(root, 'dist', excluded)), false, excluded);
  }
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/artwork.json')), fs.readFileSync(path.join(root, 'content/artwork.json')));
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/CNAME')), fs.readFileSync(path.join(root, 'public/CNAME')));
});

test('each public input is copied byte-for-byte', () => {
  for (const file of listFiles(path.join(root, 'public'))) {
    assert.equal(hash(fs.readFileSync(path.join(root, 'public', file))), hash(fs.readFileSync(path.join(root, 'dist', file))), file);
  }
  for (const file of listFiles(path.join(root, 'src/assets'))) {
    assert.equal(hash(fs.readFileSync(path.join(root, 'src/assets', file))), hash(fs.readFileSync(path.join(root, 'dist/assets', file))), file);
  }
});

test('templates and organized media are the only maintained sources', () => {
  for (const filename of pages) {
    assert.equal(fs.existsSync(path.join(root, filename)), false, filename);
    assert.ok(fs.existsSync(path.join(root, 'src', filename.replace('.html', '.njk'))));
  }
  for (const filename of ['header.njk', 'footer.njk']) assert.ok(fs.existsSync(path.join(root, 'src/_includes/components', filename)));
  assert.equal(fs.existsSync(path.join(root, 'artwork.json')), false);
  assert.equal(fs.existsSync(path.join(root, 'public/image')), false);
  assert.ok(fs.existsSync(path.join(root, 'public/media/artworks')));
  assert.ok(fs.existsSync(path.join(root, 'public/media/site')));
  assert.ok(fs.existsSync(path.join(root, 'public/media/brand')));
});

test('content validation permits current records and preserves declared legacy exceptions only', async () => {
  const result = await validateContent();
  const current = validateArtworks(JSON.parse(fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8')));
  assert.equal(result.artworks, current.length);
  const exceptions = require('../content/legacy-missing-details.json');
  for (const missing of result.missingDetails) assert.ok(exceptions.includes(missing));
});

test('CMS exposes artworks only and preserves the full existing record shape', () => {
  const config = validateCmsConfig(root);
  assert.deepEqual(config.media.map(media => media.input), ['public/media/artworks']);
  assert.deepEqual(config.content.map(entry => entry.path), ['content/artwork.json']);
});
