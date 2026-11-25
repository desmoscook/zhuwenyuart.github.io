const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, validateContent, validateOutput } = require('./site-contract.cjs');
const { validateCmsConfig } = require('./cms-config.cjs');

async function buildSite() {
  validateCmsConfig(root);
  const content = await validateContent();
  const staging = fs.mkdtempSync(path.join(root, '.build-'));
  const output = path.join(root, 'dist');
  const backup = path.join(staging, '.previous-output');
  let previousMoved = false;
  try {
    // Give each build a fresh generator process/config/cache, with an explicit
    // staging directory. Failed builds never write into the current dist/.
    execFileSync(process.execPath, [
      path.join(root, 'node_modules/@11ty/eleventy/cmd.cjs'),
      '--config=eleventy.config.cjs',
    ], { cwd: root, env: { ...process.env, SITE_BUILD_OUTPUT: staging }, stdio: 'inherit' });
    const checked = validateOutput(staging);
    // Do not delete the current preview on a validation/render failure.
    if (fs.existsSync(output)) {
      fs.renameSync(output, backup);
      previousMoved = true;
    }
    try {
      fs.renameSync(staging, output);
    } catch (error) {
      if (previousMoved) fs.renameSync(backup, output);
      throw error;
    }
    // backup moved together with staging; remove only our bound previous output.
    fs.rmSync(path.join(output, '.previous-output'), { recursive: true, force: true });
    console.log(`Build checked: ${content.artworks} artworks, ${checked.pages} pages, ${checked.files} public files.`);
    if (content.missingDetails.length) console.warn(`Known legacy detail-image references missing: ${content.missingDetails.length} (data retained).`);
    return output;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  buildSite().catch(error => {
    console.error(`Build failed; previous output retained: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { buildSite };
