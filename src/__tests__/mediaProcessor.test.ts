import { describe, expect, it } from 'vitest';
import {
  applyChromaToCanvas,
  detectChromaFromCanvas,
  detectFeetAnchor,
  getBoundingBox,
  isChromaPixel,
} from '../features/battle-map/media/mediaProcessor.ts';

// Mock Canvas 2D Context for node/vitest tests
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(dataOrWidth: number | Uint8ClampedArray, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = height || 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = height || 0;
      this.height = Math.floor(dataOrWidth.length / (4 * (height || 1)));
    }
  }
}

class MockContext2D {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8ClampedArray(width * height * 4);
  }

  setPixel(x: number, y: number, r: number, g: number, b: number, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.buffer[idx] = r;
    this.buffer[idx + 1] = g;
    this.buffer[idx + 2] = b;
    this.buffer[idx + 3] = a;
  }

  fill(r: number, g: number, b: number, a = 255) {
    for (let i = 0; i < this.buffer.length; i += 4) {
      this.buffer[i] = r;
      this.buffer[i + 1] = g;
      this.buffer[i + 2] = b;
      this.buffer[i + 3] = a;
    }
  }

  getImageData(sx: number, sy: number, sw: number, sh: number) {
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const srcX = sx + x;
        const srcY = sy + y;
        if (srcX >= 0 && srcX < this.width && srcY >= 0 && srcY < this.height) {
          const srcIdx = (srcY * this.width + srcX) * 4;
          const dstIdx = (y * sw + x) * 4;
          data[dstIdx] = this.buffer[srcIdx];
          data[dstIdx + 1] = this.buffer[srcIdx + 1];
          data[dstIdx + 2] = this.buffer[srcIdx + 2];
          data[dstIdx + 3] = this.buffer[srcIdx + 3];
        }
      }
    }
    return { data, width: sw, height: sh } as unknown as ImageData;
  }

  putImageData(
    imgData: { width: number; height: number; data: Uint8ClampedArray },
    dx: number,
    dy: number,
  ) {
    const sw = imgData.width;
    const sh = imgData.height;
    const data = imgData.data;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const dstX = dx + x;
        const dstY = dy + y;
        if (dstX >= 0 && dstX < this.width && dstY >= 0 && dstY < this.height) {
          const srcIdx = (y * sw + x) * 4;
          const dstIdx = (dstY * this.width + dstX) * 4;
          this.buffer[dstIdx] = data[srcIdx];
          this.buffer[dstIdx + 1] = data[srcIdx + 1];
          this.buffer[dstIdx + 2] = data[srcIdx + 2];
          this.buffer[dstIdx + 3] = data[srcIdx + 3];
        }
      }
    }
  }
}

describe('Media Processor — Chroma & Anchor Detection', () => {
  it('correctly classifies chroma pixels for green and magenta screen', () => {
    // Green screen pixel (r=10, g=200, b=10)
    expect(isChromaPixel(10, 200, 10, 255, 'verde')).toBe(true);
    // Magenta screen pixel (r=220, g=20, b=220)
    expect(isChromaPixel(220, 20, 220, 255, 'magenta')).toBe(true);
    // Non-chroma subject pixel
    expect(isChromaPixel(180, 150, 100, 255, 'verde')).toBe(false);
    expect(isChromaPixel(180, 150, 100, 255, 'magenta')).toBe(false);
    // Transparent pixel always counts as background
    expect(isChromaPixel(255, 255, 255, 0, 'nenhum')).toBe(true);
  });

  it('detects green background chroma from canvas corners', () => {
    const ctx = new MockContext2D(100, 100);
    // Fill entire canvas with green background
    ctx.fill(15, 210, 20, 255);
    // Draw character in center
    for (let y = 30; y < 70; y++) {
      for (let x = 30; x < 70; x++) {
        ctx.setPixel(x, y, 200, 100, 50, 255);
      }
    }

    const chroma = detectChromaFromCanvas(ctx as unknown as CanvasRenderingContext2D, 100, 100);
    expect(chroma).toBe('verde');
  });

  it('detects magenta background chroma from canvas corners', () => {
    const ctx = new MockContext2D(100, 100);
    // Fill entire canvas with magenta background
    ctx.fill(220, 15, 220, 255);
    // Draw character in center
    for (let y = 30; y < 70; y++) {
      for (let x = 30; x < 70; x++) {
        ctx.setPixel(x, y, 40, 40, 40, 255);
      }
    }

    const chroma = detectChromaFromCanvas(ctx as unknown as CanvasRenderingContext2D, 100, 100);
    expect(chroma).toBe('magenta');
  });

  it('calculates bounding box of character removing chroma background', () => {
    const ctx = new MockContext2D(200, 200);
    // Fill with green
    ctx.fill(20, 220, 30, 255);

    // Draw character from x=50..120, y=40..160
    for (let y = 40; y <= 160; y++) {
      for (let x = 50; x <= 120; x++) {
        ctx.setPixel(x, y, 100, 100, 120, 255);
      }
    }

    const bbox = getBoundingBox(ctx as unknown as CanvasRenderingContext2D, 200, 200, 'verde');
    expect(bbox.x).toBe(50);
    expect(bbox.y).toBe(40);
    expect(bbox.width).toBe(71);
    expect(bbox.height).toBe(121);
  });

  it('detects feet anchor at bottom center of character silhouette', () => {
    const ctx = new MockContext2D(100, 100);
    // Fill with green
    ctx.fill(20, 220, 30, 255);

    // Place character body
    for (let y = 20; y <= 80; y++) {
      for (let x = 40; x <= 60; x++) {
        ctx.setPixel(x, y, 150, 80, 50, 255);
      }
    }

    const anchor = detectFeetAnchor(ctx as unknown as CanvasRenderingContext2D, 100, 100, 'verde');
    // Feet lowest Y is at 80/100 = 0.8
    expect(anchor.anchor_y).toBeCloseTo(0.8, 1);
    // X center is around 50/100 = 0.5
    expect(anchor.anchor_x).toBeCloseTo(0.5, 1);
  });

  it('applies transparency to chroma pixels in canvas', () => {
    const ctx = new MockContext2D(10, 10);
    ctx.fill(10, 230, 10, 255); // Green pixel
    ctx.setPixel(5, 5, 200, 50, 50, 255); // Red character pixel

    applyChromaToCanvas(ctx as unknown as CanvasRenderingContext2D, 10, 10, 'verde');

    const greenPixel = ctx.getImageData(0, 0, 1, 1).data;
    expect(greenPixel[3]).toBe(0); // Alpha is 0 (transparent)

    const charPixel = ctx.getImageData(5, 5, 1, 1).data;
    expect(charPixel[3]).toBe(255); // Alpha preserved for character
  });
});
