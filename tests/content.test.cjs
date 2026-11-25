const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { validateArtworkContent, validateImage, limits } = require('../scripts/artwork-validation.cjs');
const { validateArtworks, imagePath } = require('../src/assets/js/portfolio/artwork-data.js');
const { validateCmsConfig } = require('../scripts/cms-config.cjs');
const root = path.resolve(__dirname, '..');

const record = overrides => ({
  name: '测试作品', path: '/media/artworks/probe.png', time: '2026',
  category: '新 系列 [a:b]', material: '布面油画', size: '20×30cm', des: '', ...overrides,
});

async function fixture(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-content-'));
  fs.mkdirSync(path.join(directory, 'public/media/artworks'), { recursive: true });
  const image = path.join(directory, 'public/media/artworks/probe.png');
  await sharp({ create: { width: 12, height: 10, channels: 3, background: '#998877' } }).png().toFile(image);
  try { await run(directory, image); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

test('catalog contract accepts editing, addition, deletion, empty data and optional text fields', async () => {
  await fixture(async directory => {
    const second = '/media/artworks/second.png';
    fs.copyFileSync(path.join(directory, 'public/media/artworks/probe.png'), path.join(directory, 'public', second.slice(1)));
    const options = { projectRoot: directory, legacyMissingDetails: [] };
    assert.equal((await validateArtworkContent({ ...options, artworks: [record()] })).artworks, 1);
    assert.equal((await validateArtworkContent({ ...options, artworks: [record({ name: '修改 " <作品> &', des: '说明' }), record({ name: '新增', path: second })] })).artworks, 2);
    assert.equal((await validateArtworkContent({ ...options, artworks: [record({ path: second })] })).artworks, 1);
    assert.equal((await validateArtworkContent({ ...options, artworks: [] })).artworks, 0);
    const optional = record();delete optional.des;
    assert.equal(validateArtworks([optional])[0].des, '');
  });
});

test('image paths reject traversal, external sources, wrong subtree, SVG and duplicates', () => {
  for (const value of [
    'https://example.com/art.png', '//example.com/art.png', '/media/site/photo.png',
    '/media/artworks/../private.png', '/media/artworks/%2e%2e/private.png',
    '/media/artworks/a.png?x=1', '/media/artworks/a.svg', '/media/artworks/.secret.png',
    '/media/artworks/a\\b.png', '/media/artworks//a.png',
  ]) assert.throws(() => imagePath(value), value);
  assert.equal(imagePath('media/artworks/测试.png'), '/media/artworks/测试.png');
  assert.throws(() => validateArtworks([record(), record({ name: '重复引用' })]), /重复/);
  assert.throws(() => validateArtworks([record({ time: '今年' })]), /年份/);
  assert.throws(() => validateArtworks([record({ name: '' })]), /name/);
  assert.throws(() => validateArtworks([record({ detail: 'not a list' })]), /列表/);
});

test('new missing detail paths fail while explicitly recorded old exceptions remain visible', async () => {
  await fixture(async directory => {
    const missing = '/media/artworks/old-missing.png';
    const artwork = record({ detail: [missing] });
    await assert.rejects(validateArtworkContent({ projectRoot: directory, artworks: [artwork] }), /找不到/);
    const result = await validateArtworkContent({ projectRoot: directory, artworks: [artwork], legacyMissingDetails: [missing] });
    assert.deepEqual(result.missingDetails, [missing]);
    await assert.rejects(validateArtworkContent({ projectRoot: directory, artworks: [record({ path: missing })], legacyMissingDetails: [missing] }), /找不到/);
  });
});

test('uploaded images are decoded, limited and checked against their real format even before use', async () => {
  await fixture(async (directory, image) => {
    const wrong = path.join(directory, 'public/media/artworks/wrong.jpg');
    fs.copyFileSync(image, wrong);
    await assert.rejects(validateImage(wrong), /真实格式/);
    fs.unlinkSync(wrong);
    const bad = path.join(directory, 'public/media/artworks/bad.png');
    fs.writeFileSync(bad, 'not an image');
    await assert.rejects(validateArtworkContent({ projectRoot: directory, artworks: [] }));
    fs.unlinkSync(bad);
    fs.writeFileSync(bad, Buffer.alloc(limits.maxBytes + 1));
    await assert.rejects(validateImage(bad), /5 MiB/);
    fs.unlinkSync(bad);
    const huge = path.join(directory, 'public/media/artworks/huge.png');
    await sharp({ create: { width: limits.maxSide + 1, height: 1, channels: 3, background: '#123456' } }).png().toFile(huge);
    await assert.rejects(validateImage(huge), /像素尺寸/);
  });
});

test('CMS configuration has no non-artwork editor or media library and round-trips optional fields', () => {
  const config = validateCmsConfig(root);
  assert.equal(config.media.length, 1);
  assert.equal(config.content.length, 1);
  assert.equal(config.media[0].input, 'public/media/artworks');
  const fields = config.content[0].fields.map(field => field.name);
  for (const artwork of JSON.parse(fs.readFileSync(path.join(root, 'content/artwork.json'), 'utf8'))) {
    const saved = Object.fromEntries(fields.filter(key => Object.hasOwn(artwork, key)).map(key => [key, artwork[key]]));
    assert.deepEqual(saved, artwork);
  }
});
