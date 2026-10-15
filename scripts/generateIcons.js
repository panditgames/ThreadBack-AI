import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(2, 9); // Color type: Truecolor (RGB)
  ihdr.writeUInt8(0, 10); // Compression method
  ihdr.writeUInt8(0, 11); // Filter method
  ihdr.writeUInt8(0, 12); // Interlace method

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);

    const crcBuf = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (let i = 0; i < crcBuf.length; i++) {
      crc ^= crcBuf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each line
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte: None
    for (let x = 0; x < width; x++) {
      // Create a nice gradient from cyan (6, 182, 212) to indigo (99, 102, 241)
      const ratio = (x + y) / (width + height);
      const pr = Math.round(r * (1 - ratio) + 99 * ratio);
      const pg = Math.round(g * (1 - ratio) + 102 * ratio);
      const pb = Math.round(b * (1 - ratio) + 241 * ratio);

      rawData.writeUInt8(pr, offset++);
      rawData.writeUInt8(pg, offset++);
      rawData.writeUInt8(pb, offset++);
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createPNG(16, 16, 6, 182, 212));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createPNG(48, 48, 6, 182, 212));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createPNG(128, 128, 6, 182, 212));
console.log('Generated brand icons in public/icons/');
