const fs = require('node:fs');

/** @param {import('@11ty/eleventy/UserConfig').default} eleventyConfig */
module.exports = function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({
    autoescape: true,
    throwOnUndefined: true,
    trimBlocks: false,
    lstripBlocks: false,
  });
  // Output URLs deliberately match the existing static site. Neither source
  // directory names nor development files become part of the published URL.
  for (const directory of fs.readdirSync('public', { withFileTypes: true })) {
    const name = directory.name;
    eleventyConfig.addPassthroughCopy({ [`public/${name}`]: name });
  }
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'content/artwork.json': 'artwork.json' });
  eleventyConfig.addWatchTarget('content/artwork.json');
  eleventyConfig.addWatchTarget('public/');
  eleventyConfig.addWatchTarget('src/assets/');
};

module.exports.config = {
  dir: { input: 'src', includes: '_includes', data: '_data', output: process.env.SITE_BUILD_OUTPUT || 'dist' },
  templateFormats: ['njk'],
  htmlTemplateEngine: 'njk',
  markdownTemplateEngine: false,
};
