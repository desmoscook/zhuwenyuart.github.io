const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createPreviewServer } = require('../scripts/dev-server.cjs');

async function withServer(run, root) {
  const server = createPreviewServer(root ? { root } : {});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test('preview serves four pages, data, CSS, JavaScript and Unicode image paths', async () => {
  await withServer(async baseURL => {
    for (const url of ['/', '/about/', '/contact/', '/portfolios/']) {
      const response = await fetch(baseURL + url);
      assert.equal(response.status, 200, url);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.match(await response.text(), /<body\b/);
    }
    const data = await fetch(baseURL + '/artwork.json');
    const artworks = await data.json();
    const expectedArtworks = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'artwork.json'), 'utf8'));
    assert.deepEqual(artworks, expectedArtworks);
    const image = await fetch(baseURL + (artworks[0]?.path || '/media/site/home/010acfc535210d03f216c077fece751.jpg'));
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /^image\//);
    const css = await fetch(baseURL + '/assets/css/shared/astra-theme.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    const js = await fetch(baseURL + '/assets/js/portfolio/gallery.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /text\/javascript/);
    const head = await fetch(baseURL + '/artwork.json', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  });
});

test('preview does not serve development files, hidden files, raw originals or directory listings', async () => {
  await withServer(async baseURL => {
    for (const url of [
      '/.git/config', '/package.json', '/package-lock.json', '/README.md',
      '/node_modules/@playwright/test/package.json', '/scripts/dev-server.cjs',
      '/tests/helpers.cjs', '/image_origin/', '/assets/', '/assets/.env',
      '/assets/%2e%2e%2f.git/config', '/%E0%A4%A', '/assets/%00.css',
    ]) {
      const response = await fetch(baseURL + url);
      assert.ok([400, 404].includes(response.status), `${url}: ${response.status}`);
    }
    const post = await fetch(baseURL + '/', { method: 'POST', body: 'no uploads' });
    assert.equal(post.status, 405);
    const redirect = await fetch(baseURL + '/about?x=1', { redirect: 'manual' });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), '/about/?x=1');
  });
});

test('preview rejects symlinks into private directories or outside its root', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'site-preview-test-'));
  const root = path.join(temporary, 'site');
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  const external = path.join(temporary, 'secret.js');
  fs.writeFileSync(external, 'secret content');
  fs.symlinkSync(external, path.join(root, 'assets', 'outside.js'));
  fs.mkdirSync(path.join(root, 'tests'));
  fs.writeFileSync(path.join(root, 'tests', 'private.js'), 'private code');
  fs.symlinkSync(path.join(root, 'tests', 'private.js'), path.join(root, 'assets', 'private.js'));
  try {
    await withServer(async baseURL => {
      for (const pathname of ['/assets/outside.js', '/assets/private.js']) {
        const response = await fetch(baseURL + pathname);
        assert.equal(response.status, 404);
        assert.equal(await response.text(), 'Not found');
      }
    }, root);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
