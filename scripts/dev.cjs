const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { once } = require('node:events');
const { buildSite } = require('./build.cjs');
const { createPreviewServer } = require('./dev-server.cjs');

async function main() {
  const { values } = parseArgs({ options: {
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '8001' },
    watch: { type: 'boolean', default: true },
  }, allowNegative: true });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535');
  const output = await buildSite();
  const server = createPreviewServer({ root: output });
  server.listen(port, values.host);
  await once(server, 'listening');
  console.log(`Preview ready: http://${values.host}:${port}/`);
  console.log('Templates and assets rebuild on save; refresh the browser to see changes.');
  console.log('Use SSH forwarding for remote access. No authentication: development only.');
  if (!['127.0.0.1', '::1', 'localhost'].includes(values.host)) console.warn('Network binding enabled; use only on a trusted private network.');
  if (!values.watch) return;
  let running = false;
  let pending = false;
  let timer;
  async function rebuild() {
    if (running) { pending = true; return; }
    running = true;
    try {
      await buildSite();
      console.log('Updated dist/. Refresh the browser.');
    } catch (error) {
      console.error(`Rebuild failed; last successful preview retained: ${error.message}`);
    } finally {
      running = false;
      if (pending) { pending = false; queueMicrotask(rebuild); }
    }
  }
  const watchers = [
    ...['src', 'content', 'public', 'legacy'].map(directory =>
      path.join(__dirname, '..', directory)),
    path.join(__dirname, '..', 'eleventy.config.cjs'),
  ].map(target => fs.watch(target, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  }));
  const stop = () => {
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    server.closeAllConnections();
    server.close(() => process.exit());
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
