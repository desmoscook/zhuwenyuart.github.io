const fs = require('node:fs');
const path = require('node:path');
const { validateArtworkContent } = require('./artwork-validation.cjs');
const legacyMissingDetails = require('../content/legacy-missing-details.json');

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

// Regular content validation permits editing, insertion, deletion and an empty
// gallery. Only explicitly recorded legacy missing detail paths are tolerated.
async function validateContent() {
  return validateArtworkContent({
    projectRoot: root,
    artworks: JSON.parse(fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8')),
    legacyMissingDetails,
  });
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
