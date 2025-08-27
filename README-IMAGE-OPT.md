Image optimization helper

This repository includes a small Node script that generates responsive WebP and AVIF images from JPEG/PNG sources in `public/assets` and `public/productos`.

Usage:
1. Install sharp as a dev dependency:
   npm install --save-dev sharp

2. Run the generator:
   node tools/generate-responsive-images.js

Outputs:
- For each source image `image.jpg` in the scanned folders, files like `image-400.webp`, `image-800.avif`, etc. will be generated.

Notes:
- Adjust `sizes` in `tools/generate-responsive-images.js` as needed.
- This is a simple helper for local builds; for production pipelines use an automated image CDN or build step.
