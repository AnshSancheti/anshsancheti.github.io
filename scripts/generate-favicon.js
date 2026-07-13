const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GRID_SIZE = 16;
const BACKGROUND = [0, 0, 0, 0];
const INK = [23, 23, 21, 255];

const inkCells = new Set();

const fill = (x, y, width, height) => {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      inkCells.add(`${column},${row}`);
    }
  }
};

// A
fill(2, 2, 4, 2);
fill(1, 3, 2, 4);
fill(5, 3, 2, 4);
fill(1, 7, 6, 2);
fill(1, 9, 2, 5);
fill(5, 9, 2, 5);

// S
fill(9, 2, 6, 2);
fill(9, 4, 2, 3);
fill(9, 7, 6, 2);
fill(13, 9, 2, 3);
fill(9, 12, 6, 2);

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return result;
};

const makePng = (size) => {
  const scale = size / GRID_SIZE;
  const rows = [];

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;

    for (let x = 0; x < size; x += 1) {
      const cell = `${Math.floor(x / scale)},${Math.floor(y / scale)}`;
      const color = inkCells.has(cell) ? INK : BACKGROUND;
      const offset = 1 + x * 4;
      row.set(color, offset);
    }

    rows.push(row);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const sizes = [16, 32, 48];
const images = sizes.map((size) => ({ size, data: makePng(size) }));
const publicDirectory = path.join(__dirname, '..', 'public');

for (const image of images) {
  fs.writeFileSync(path.join(publicDirectory, `favicon-${image.size}x${image.size}.png`), image.data);
}

const directorySize = 6 + images.length * 16;
let imageOffset = directorySize;
const icoHeader = Buffer.alloc(directorySize);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(images.length, 4);

images.forEach((image, index) => {
  const offset = 6 + index * 16;
  icoHeader[offset] = image.size;
  icoHeader[offset + 1] = image.size;
  icoHeader.writeUInt16LE(1, offset + 4);
  icoHeader.writeUInt16LE(32, offset + 6);
  icoHeader.writeUInt32LE(image.data.length, offset + 8);
  icoHeader.writeUInt32LE(imageOffset, offset + 12);
  imageOffset += image.data.length;
});

fs.writeFileSync(
  path.join(publicDirectory, 'favicon.ico'),
  Buffer.concat([icoHeader, ...images.map((image) => image.data)]),
);
