/*
  Simple image generation script using sharp.
  Generates AVIF and WebP variants at multiple widths for images under public/assets and public/products.

  Usage:
    npm install --save-dev sharp
    node tools/generate-responsive-images.js

  Output is written next to the original file with suffixes, e.g. image-400.webp, image-800.avif
*/

const fs = require('fs');
const path = require('path');

const srcDirs = [path.join(__dirname, '..', 'public', 'assets'), path.join(__dirname, '..', 'public', 'productos')];
const sizes = [400, 800, 1200];

async function exists(p) {
  return fs.promises.stat(p).then(() => true).catch(() => false);
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await walk(full);
      files.push(...sub);
    } else if (/\.(jpe?g|png)$/i.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Missing dependency: sharp. Run `npm install --save-dev sharp` and re-run this script.');
    process.exit(1);
  }

  for (const dir of srcDirs) {
    if (!(await exists(dir))) continue;
    console.log('Scanning', dir);
    const files = await walk(dir);
    for (const f of files) {
      console.log('Optimizing', f);
      const ext = path.extname(f);
      const base = f.slice(0, -ext.length);
      try {
        const img = sharp(f);
        for (const w of sizes) {
          const webpOut = `${base}-${w}.webp`;
          const avifOut = `${base}-${w}.avif`;
          await img.clone().resize({ width: w }).webp({ quality: 75 }).toFile(webpOut);
          await img.clone().resize({ width: w }).avif({ quality: 60 }).toFile(avifOut);
        }
      } catch (e) {
        console.error('Failed to process', f, e.message || e);
      }
    }
  }
  console.log('Done');
}

main().catch((e) => { console.error(e); process.exit(1); });
