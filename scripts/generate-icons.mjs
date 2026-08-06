// Derives the browser-tab and home-screen icons from public/logo.png.
//
// Two things make this more than a resize:
//
// 1. The source is large (1536x1024, ~2MB). A tab icon is drawn at 16-32px, so
//    handing the browser the source would download 2MB to paint a thumbnail.
//
// 2. The source is a lockup — the mark sits to the left of a "Focus List"
//    wordmark. Squeezed into a square favicon the whole lockup becomes an
//    illegible smudge, so we crop to the mark alone.
//
// The mark is located rather than hardcoded: ink pixels are projected onto the
// x axis, the artwork is split on wide blank gutters, and the segment closest
// to square wins (a mark is roughly square, a wordmark is wide). If the logo is
// ever replaced with a mark-only image this still does the right thing.
//
// Next's app-directory file convention picks the outputs up automatically:
//   src/app/icon.png        -> <link rel="icon">
//   src/app/apple-icon.png  -> <link rel="apple-touch-icon">
//
// Re-run with `yarn icons` whenever public/logo.png changes.

import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public", "logo.png");

// A pixel is "ink" when it is opaque enough to see and not near-white.
const ALPHA_FLOOR = 32;
const WHITE_CEILING = 235;
// Blank columns narrower than this are letter spacing, not a gutter.
const MIN_GUTTER = 12;
// Breathing room around the mark, as a fraction of its longest side.
const PADDING = 0.14;

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

function findMark(data, width, height, channels) {
  const isInk = (x, y) => {
    const i = (y * width + x) * channels;
    return (
      data[i + 3] > ALPHA_FLOOR &&
      (data[i] < WHITE_CEILING ||
        data[i + 1] < WHITE_CEILING ||
        data[i + 2] < WHITE_CEILING)
    );
  };

  const columnHasInk = [];
  for (let x = 0; x < width; x++) {
    let ink = false;
    for (let y = 0; y < height && !ink; y++) if (isInk(x, y)) ink = true;
    columnHasInk.push(ink);
  }

  // Split the artwork into horizontal segments separated by wide gutters.
  const segments = [];
  let start = -1;
  let blank = 0;
  for (let x = 0; x < width; x++) {
    if (columnHasInk[x]) {
      if (start === -1) start = x;
      blank = 0;
    } else if (start !== -1 && ++blank >= MIN_GUTTER) {
      segments.push([start, x - blank]);
      start = -1;
      blank = 0;
    }
  }
  if (start !== -1) segments.push([start, width - 1]);
  if (segments.length === 0) throw new Error("logo appears to be blank");

  // Measure each segment's vertical extent, then prefer the squarest one.
  const measured = segments.map(([x0, x1]) => {
    let y0 = height;
    let y1 = -1;
    for (let x = x0; x <= x1; x++) {
      for (let y = 0; y < height; y++) {
        if (isInk(x, y)) {
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    return { x0, y0, w, h, squareness: Math.abs(Math.log(w / h)) };
  });

  measured.sort((a, b) => a.squareness - b.squareness);
  return measured[0];
}

const sourceInfo = await stat(source).catch(() => null);
if (!sourceInfo) {
  console.error(`generate-icons: missing ${path.relative(root, source)}`);
  process.exit(1);
}

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const mark = findMark(data, info.width, info.height, info.channels);

// Expand the mark's box to a padded square, clamped to the canvas.
const side = Math.round(Math.max(mark.w, mark.h) * (1 + PADDING));
const cx = mark.x0 + mark.w / 2;
const cy = mark.y0 + mark.h / 2;
const extract = {
  left: Math.max(0, Math.min(info.width - side, Math.round(cx - side / 2))),
  top: Math.max(0, Math.min(info.height - side, Math.round(cy - side / 2))),
  width: Math.min(side, info.width),
  height: Math.min(side, info.height),
};

console.log(
  `source: ${path.relative(root, source)} ${info.width}x${info.height} ` +
    `(${(sourceInfo.size / 1024).toFixed(0)} KB)`
);
console.log(
  `  mark found at ${mark.w}x${mark.h}, cropping ` +
    `${extract.width}x${extract.height} at (${extract.left}, ${extract.top})`
);

for (const { file, size, background } of TARGETS) {
  const out = path.join(root, file);
  await sharp(source)
    .extract(extract)
    .resize(size, size, { fit: "contain", background })
    .flatten(background.alpha === 1 ? { background } : false)
    .png({ compressionLevel: 9 })
    .toFile(out);

  const { size: bytes } = await stat(out);
  console.log(`  wrote ${file} ${size}x${size} (${(bytes / 1024).toFixed(1)} KB)`);
}
