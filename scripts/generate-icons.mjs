import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Minimal pure Node PNG generator
function createPng(width, height, isMaskable = false) {
  // RGBA buffer: width * height * 4
  // Each scanline starts with filter byte 0
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);
  
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter: None
    
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Background: Deep Slate Gradient #0F172A to #1E293B
      const t = (x + y) / (width + height);
      let r = Math.round(15 + t * 15);
      let g = Math.round(23 + t * 18);
      let b = Math.round(42 + t * 17);
      let a = 255;
      
      if (!isMaskable) {
        // Squircle / rounded rect for normal icon
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerR));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerR));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0;
        }
      }
      
      if (a > 0) {
        // Draw Rupee sign & flow graphics inside safe zone
        // Normalised coords in [-1, 1]
        const nx = (x - cx) / (width * 0.35);
        const ny = (y - cy) / (height * 0.35);
        
        let isSymbol = false;
        let isAccent = false;
        
        // Vertical stem of Rupee: x in [-0.55, -0.4], y in [-0.65, 0.65]
        if (nx >= -0.55 && nx <= -0.38 && ny >= -0.65 && ny <= 0.65) {
          isSymbol = true;
        }
        // Top horizontal bar: nx in [-0.55, 0.45], ny in [-0.65, -0.48]
        if (nx >= -0.55 && nx <= 0.45 && ny >= -0.65 && ny <= -0.48) {
          isSymbol = true;
        }
        // Second horizontal bar: nx in [-0.55, 0.45], ny in [-0.35, -0.18]
        if (nx >= -0.55 && nx <= 0.45 && ny >= -0.35 && ny <= -0.18) {
          isSymbol = true;
        }
        // Upper loop: ny in [-0.65, -0.18], nx in [-0.4, 0.45]
        const loopDx = nx - -0.38;
        const loopDy = ny - -0.41;
        const loopR = Math.sqrt((loopDx * 0.7) * (loopDx * 0.7) + loopDy * loopDy);
        if (loopR >= 0.16 && loopR <= 0.28 && nx >= -0.38) {
          isSymbol = true;
        }
        // Slash downward to right:
        if (ny >= -0.18 && ny <= 0.65) {
          const expectedNx = -0.38 + (ny - -0.18) * 0.85;
          if (Math.abs(nx - expectedNx) < 0.1) {
            isSymbol = true;
          }
        }
        
        // Emerald flow upward arrow at bottom right: nx in [0.1, 0.6], ny in [0.0, 0.6]
        const arrowDx = nx - 0.45;
        const arrowDy = ny - 0.25;
        const arrowDist = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
        if (arrowDist < 0.12) {
          isAccent = true;
        }
        // Arrow diagonal shaft
        if (nx >= 0.15 && nx <= 0.45 && ny >= 0.25 && ny <= 0.55) {
          const expectedArrowNx = 0.45 - (ny - 0.25) * 1.0;
          if (Math.abs(nx - expectedArrowNx) < 0.08) {
            isAccent = true;
          }
        }

        if (isAccent) {
          r = 34; g = 197; b = 94; // emerald #22c55e
        } else if (isSymbol) {
          r = 255; g = 255; b = 255; // clean white
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace: None
  const ihdrChunk = makeChunk('IHDR', ihdr);
  
  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const publicDir = path.resolve('./public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, false));
console.log('Successfully generated all PWA PNG icons!');
