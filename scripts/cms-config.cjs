const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { validateArtworks } = require('../src/assets/js/portfolio/artwork-data.js');

const expectedFields = ['name', 'path', 'time', 'category', 'material', 'size', 'des', 'detail'];
const expectedTypes = { name: 'string', path: 'image', time: 'string', category: 'string', material: 'string', size: 'string', des: 'text', detail: 'image' };

function validateCmsConfig(projectRoot) {
  const config = yaml.load(fs.readFileSync(path.join(projectRoot, '.pages.yml'), 'utf8'), { schema: yaml.JSON_SCHEMA });
  if (!Array.isArray(config.media) || config.media.length !== 1 ||
      config.media[0].name !== 'artworks' || config.media[0].input !== 'public/media/artworks' ||
      config.media[0].output !== '/media/artworks' || config.media[0].rename !== 'random' ||
      JSON.stringify(config.media[0].extensions) !== JSON.stringify(['jpg', 'jpeg', 'png', 'webp'])) {
    throw new Error('CMS media must expose only public/media/artworks');
  }
  if (!Array.isArray(config.content) || config.content.length !== 1) throw new Error('CMS must expose only artwork management');
  const entry = config.content[0];
  if (entry.type !== 'file' || entry.path !== 'content/artwork.json' || entry.format !== 'json' || entry.list !== true) {
    throw new Error('CMS must preserve the artwork.json top-level array');
  }
  if (JSON.stringify(entry.fields.map(field => field.name).sort()) !== JSON.stringify([...expectedFields].sort())) {
    throw new Error('CMS schema must preserve all eight existing artwork fields');
  }
  for (const field of entry.fields) {
    if (field.type !== expectedTypes[field.name]) throw new Error(`CMS field has unexpected type: ${field.name}`);
    if (!['des', 'detail'].includes(field.name) && field.required !== true) throw new Error(`CMS required field missing: ${field.name}`);
  }
  for (const field of entry.fields.filter(field => ['path', 'detail'].includes(field.name))) {
    if (field.type !== 'image' || field.options?.media !== 'artworks') throw new Error('CMS images must use the artwork-only media source');
  }
  if (entry.fields.find(field => field.name === 'detail').list !== true) throw new Error('detail must remain an array');
  const records = JSON.parse(fs.readFileSync(path.join(projectRoot, entry.path), 'utf8'));
  validateArtworks(records);
  const known = new Set(expectedFields);
  for (const record of records) {
    for (const field of Object.keys(record)) {
      if (!known.has(field)) throw new Error(`CMS schema does not preserve artwork field: ${field}`);
    }
  }
  return config;
}

module.exports = { validateCmsConfig };
