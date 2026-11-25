const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const source = path.resolve(__dirname, '..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function runBuild(directory) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build.cjs'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('exit', code => resolve({ code, output }));
  });
}

async function waitFor(check, description) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 75));
  }
  throw new Error(`Timed out: ${description}`);
}

async function freePort() {
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('isolated builds accept CMS edits and preserve last output on failures, watch changes and occupied ports', { timeout: 120_000 }, async () => {
  const directory = fs.mkdtempSync(path.join(source, '.build-lifecycle-'));
  let dev;
  try {
    for (const name of ['src', 'public', 'content', 'legacy', 'scripts']) {
      fs.cpSync(path.join(source, name), path.join(directory, name), { recursive: true });
    }
    for (const name of ['package.json', 'eleventy.config.cjs', '.pages.yml']) fs.copyFileSync(path.join(source, name), path.join(directory, name));
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
    const first = await runBuild(directory);
    assert.equal(first.code, 0, first.output);
    const html = path.join(directory, 'dist/index.html');
    const firstHash = hash(html);
    fs.writeFileSync(path.join(directory, 'dist', 'stale.txt'), 'must not survive a rebuild');
    const second = await runBuild(directory);
    assert.equal(second.code, 0, second.output);
    assert.equal(hash(html), firstHash);
    assert.equal(fs.existsSync(path.join(directory, 'dist/stale.txt')), false);
    const artworkPath = path.join(directory, 'content/artwork.json');
    const originalCatalog = JSON.parse(fs.readFileSync(artworkPath, 'utf8'));
    const beforeCatalog = JSON.stringify(originalCatalog);
    const insertedPath = '/media/artworks/cms-insertion-probe.jpg';
    fs.copyFileSync(path.join(directory, 'public', originalCatalog[0].path.slice(1)), path.join(directory, 'public', insertedPath.slice(1)));
    const updatedCatalog = originalCatalog.map((art, index) => index ? art : { ...art, name: art.name + ' 已编辑' });
    updatedCatalog.push({ ...originalCatalog[0], name: '新增作品', path: insertedPath, time: '2030', category: '新 系列 [x:y]' });
    fs.writeFileSync(artworkPath, JSON.stringify(updatedCatalog));
    const inserted = await runBuild(directory);
    assert.equal(inserted.code, 0, inserted.output);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'dist/artwork.json'), 'utf8')).length, originalCatalog.length + 1);
    updatedCatalog.splice(0, 1);
    fs.writeFileSync(artworkPath, JSON.stringify(updatedCatalog));
    const removed = await runBuild(directory);
    assert.equal(removed.code, 0, removed.output);
    fs.writeFileSync(artworkPath, beforeCatalog);
    fs.unlinkSync(path.join(directory, 'public', insertedPath.slice(1)));
    const restored = await runBuild(directory);
    assert.equal(restored.code, 0, restored.output);
    const template = path.join(directory, 'src/index.njk');
    const original = fs.readFileSync(template, 'utf8');
    fs.writeFileSync(template, original + '\n{% if %}');
    const failed = await runBuild(directory);
    assert.notEqual(failed.code, 0);
    assert.equal(hash(html), firstHash, 'Failed template build must not change old output');
    fs.writeFileSync(template, original);
    const port = await freePort();
    dev = spawn(process.execPath, ['scripts/dev.cjs', '--port', String(port)], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    dev.stdout.on('data', data => { log += data; });
    dev.stderr.on('data', data => { log += data; });
    await waitFor(() => log.includes('Preview ready:'), 'initial development build');
    const collision = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/dev.cjs', '--port', String(port)], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
      let message = '';
      child.stdout.on('data', data => { message += data; });
      child.stderr.on('data', data => { message += data; });
      child.once('error', reject);
      child.once('exit', code => resolve({ code, message }));
    });
    assert.notEqual(collision.code, 0, 'Occupied preview port must fail instead of leaving watchers running');
    assert.match(collision.message, /EADDRINUSE/);
    fs.writeFileSync(template, original.replace('Welcome To', 'Template rebuild probe'));
    await waitFor(() => fs.readFileSync(html, 'utf8').includes('Template rebuild probe'), 'template watch rebuild');
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Template rebuild probe/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/content/artwork.json`)).status, 404);
  } finally {
    if (dev && dev.exitCode === null) {
      await new Promise(resolve => { dev.once('exit', resolve); dev.kill('SIGTERM'); });
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
