// Derives browser-tab and home-screen icons from the canonical brand mark.
//
// Next's app-directory file convention picks the outputs up automatically:
//   src/app/icon.png        -> <link rel="icon">
//   src/app/apple-icon.png  -> <link rel="apple-touch-icon">
//
// Re-run with `yarn icons` whenever the canonical mark changes.

import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public", "brand", "focus-list-mark.png");

const TARGETS = [
  { file: "src/app/icon.png", size: 256, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  // iOS composites transparency to black on some versions, so this one is
  // flattened onto the app's card white.
  {
    file: "src/app/apple-icon.png",
    size: 180,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
];

const sourceInfo = await stat(source).catch(() => null);
if (!sourceInfo) {
  console.error(`generate-icons: missing ${path.relative(root, source)}`);
  process.exit(1);
}

const info = await sharp(source).metadata();

console.log(
  `source: ${path.relative(root, source)} ${info.width}x${info.height} ` +
    `(${(sourceInfo.size / 1024).toFixed(0)} KB)`
);
for (const { file, size, background } of TARGETS) {
  const out = path.join(root, file);
  await sharp(source)
    .resize(size, size, { fit: "contain", background })
    .flatten(background.alpha === 1 ? { background } : false)
    .png({ compressionLevel: 9 })
    .toFile(out);

  const { size: bytes } = await stat(out);
  console.log(`  wrote ${file} ${size}x${size} (${(bytes / 1024).toFixed(1)} KB)`);
}
