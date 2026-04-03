// Render icon.svg into every size Electron / OS installers need:
//   build/icon.png  (512x512, Linux)
//   build/icon.ico  (Windows, multi-size)
//   build/icon.icns (macOS, multi-size)

const path = require("node:path");
const fs = require("node:fs");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "icon.svg");
const OUT = path.join(ROOT, "build");
fs.mkdirSync(OUT, { recursive: true });

const PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Missing ${SRC}`);
  const svg = fs.readFileSync(SRC);

  console.log("[icons] rendering PNGs");
  const pngPaths = [];
  for (const size of PNG_SIZES) {
    const out = path.join(OUT, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
    pngPaths.push(out);
  }

  // Linux / Electron window icon
  await sharp(svg).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, "icon.png"));

  console.log("[icons] packing .ico for Windows");
  const ico = await pngToIco([16, 24, 32, 48, 64, 128, 256].map((s) => path.join(OUT, `icon-${s}.png`)));
  fs.writeFileSync(path.join(OUT, "icon.ico"), ico);

  console.log("[icons] packing .icns for macOS");
  // minimal .icns with 512x512 and 256x256 (electron-builder will upscale if needed)
  writeIcns([
    { type: "ic09", size: 512 },
    { type: "ic08", size: 256 },
    { type: "ic07", size: 128 },
    { type: "ic05", size: 32 },
  ]);

  console.log("[icons] done. output in", OUT);
}

function writeIcns(entries) {
  const chunks = [];
  for (const e of entries) {
    const png = fs.readFileSync(path.join(OUT, `icon-${e.size}.png`));
    const header = Buffer.alloc(8);
    header.write(e.type, 0, 4, "ascii");
    header.writeUInt32BE(png.length + 8, 4);
    chunks.push(header, png);
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(body.length + 8, 4);
  fs.writeFileSync(path.join(OUT, "icon.icns"), Buffer.concat([header, body]));
}

main().catch((err) => { console.error(err); process.exit(1); });
