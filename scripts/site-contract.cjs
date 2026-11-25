const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'about/index.html', 'contact/index.html', 'portfolios/index.html'];

function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in publish input: ${filename}`);
    return entry.isDirectory() ? listFiles(filename, relative) : [relative];
  }).sort();
}

function expectedPublishFiles() {
  return [
    ...pages, 'single_portfolio/index.html', 'artwork.json',
    ...listFiles(path.join(root, 'public')),
    ...listFiles(path.join(root, 'src/assets')).map(file => 'assets/' + file),
  ].sort();
}

// Validate only established invariants here. Legacy optional detail paths are
// recorded as warnings, not deleted or silently published with changed data.
function validateContent() {
  const artworks = JSON.parse(fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8'));
  const publicRoot = fs.realpathSync(path.join(root, 'public'));
  function imagePath(value) {
    if (!value.startsWith('image/') || value.includes('..') || value.includes('\\') || value.includes('\0')) {
      throw new Error(`Invalid image path: ${value}`);
    }
    return path.join(publicRoot, value);
  }
  if (!Array.isArray(artworks)) throw new Error('artwork.json must contain a top-level array');
  const required = ['path', 'name', 'time', 'category', 'material', 'size', 'des'];
  const seen = new Set();
  const missingDetails = [];
  for (const artwork of artworks) {
    for (const key of required) {
      if (typeof artwork[key] !== 'string' || (key !== 'des' && !artwork[key].trim())) {
        throw new Error(`Invalid artwork ${key}: ${artwork.name || '(unnamed)'}`);
      }
    }
    if (!/^\d{4}$/.test(artwork.time)) throw new Error(`Invalid year: ${artwork.name}`);
    const primary = fs.realpathSync(imagePath(artwork.path));
    if (!primary.startsWith(publicRoot + path.sep) || !fs.statSync(primary).isFile()) {
      throw new Error(`Missing or non-public image: ${artwork.path}`);
    }
    if (seen.has(artwork.path)) throw new Error(`Duplicate image record: ${artwork.path}`);
    seen.add(artwork.path);
    if (artwork.detail !== undefined) {
      if (!Array.isArray(artwork.detail) || artwork.detail.some(value => typeof value !== 'string')) {
        throw new Error(`detail must be a list of image paths: ${artwork.name}`);
      }
      for (const detail of artwork.detail) {
        if (!fs.existsSync(imagePath(detail))) missingDetails.push(detail);
      }
    }
  }
  return { artworks: artworks.length, missingDetails };
}

function validateOutput(directory) {
  const actual = listFiles(directory);
  const expected = expectedPublishFiles();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const added = actual.filter(file => !expected.includes(file));
    const missing = expected.filter(file => !actual.includes(file));
    const error = new Error(`Unexpected publish files (${added.length}): ${added.slice(0, 8).join(', ')}; missing (${missing.length}): ${missing.slice(0, 8).join(', ')}`);
    throw error;
  }
  for (const page of pages) {
    const html = fs.readFileSync(path.join(directory, page), 'utf8');
    if ((html.match(/<body\b/gi) || []).length !== 1 || (html.match(/<\/body\s*>/gi) || []).length !== 1) {
      throw new Error(`Expected exactly one body in ${page}`);
    }
    if (/<style\b/i.test(html) || /\{%|\{\{/.test(html)) throw new Error(`Unrendered source in ${page}`);
  }
  return { files: actual.length, pages: pages.length + 1 };
}

module.exports = { root, pages, listFiles, validateContent, validateOutput, expectedPublishFiles };
