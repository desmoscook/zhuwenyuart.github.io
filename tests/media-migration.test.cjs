const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const migration = require('../scripts/media-migration.json');
const root = path.resolve(__dirname, '..');

// Separate from regular CMS checks: a one-time migration proof must not
// permanently prohibit a content editor from replacing or deleting an image.
test('all moved images preserve their original bytes and artwork metadata', () => {
  for (const file of migration.files) {
    const bytes = fs.readFileSync(path.join(root, 'public', file.to));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256, file.to);
    assert.equal(fs.existsSync(path.join(root, 'public', file.from)), false, file.from);
  }
  const original = JSON.parse(execFileSync('git', ['show', `${migration.sourceCommit}:content/artwork.json`], { cwd: root, encoding: 'utf8' }));
  const moved = new Map(migration.files.map(file => [file.from, '/' + file.to]));
  const expected = original.map(record => ({
    ...record,
    path: moved.get(record.path),
    ...(record.detail ? { detail: record.detail.map(detail => detail.replace(/^image\//, '/media/artworks/')) } : {}),
  }));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8')), expected);
});
