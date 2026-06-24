import { PNG } from 'pngjs';

import type {
  AvailabilityColorStatus,
  ParkingClusterResponse,
} from '@/types/parking-map';
import { getMarkerDimensions } from '@/utils/parking-marker-svg';

const SCALE = 3;

const PALETTES: Record<
  AvailabilityColorStatus,
  { aura: Rgba; surface: Rgba; text: Rgba; secondary: Rgba }
> = {
  green: {
    aura: [58, 167, 108, 62],
    surface: [218, 244, 230, 240],
    text: [18, 97, 61, 255],
    secondary: [18, 97, 61, 196],
  },
  orange: {
    aura: [231, 153, 63, 64],
    surface: [255, 235, 207, 242],
    text: [138, 72, 13, 255],
    secondary: [138, 72, 13, 196],
  },
  red: {
    aura: [218, 91, 85, 59],
    surface: [255, 222, 219, 242],
    text: [141, 47, 43, 255],
    secondary: [141, 47, 43, 196],
  },
};

type Rgba = [number, number, number, number];
type Glyph = readonly string[];

const GLYPHS: Record<string, Glyph> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '%': ['101', '001', '010', '100', '101'],
  ' ': ['000', '000', '000', '000', '000'],
  z: ['111', '001', '010', '100', '111'],
  o: ['000', '111', '101', '101', '111'],
  n: ['000', '110', '101', '101', '101'],
  e: ['000', '111', '110', '100', '111'],
  s: ['000', '111', '100', '011', '111'],
  p: ['000', '110', '101', '110', '100'],
  t: ['010', '111', '010', '010', '011'],
  f: ['111', '100', '110', '100', '100'],
  r: ['000', '110', '101', '100', '100'],
  '.': ['000', '000', '000', '000', '010'],
  '€': ['011', '110', '111', '110', '011'],
};

type MarkerPngInput = Pick<
  ParkingClusterResponse,
  | 'availabilityPercent'
  | 'availableSpots'
  | 'colorStatus'
  | 'minPrice'
  | 'totalCapacity'
  | 'type'
> & {
  zoneCount: number;
  zoom: number;
};

function blendPixel(png: PNG, x: number, y: number, color: Rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }
  const index = (png.width * y + x) << 2;
  const alpha = color[3] / 255;
  const destinationAlpha = png.data[index + 3] / 255;
  const outputAlpha = alpha + destinationAlpha * (1 - alpha);

  for (let channel = 0; channel < 3; channel += 1) {
    png.data[index + channel] =
      outputAlpha === 0
        ? 0
        : Math.round(
            (color[channel] * alpha +
              png.data[index + channel] *
                destinationAlpha *
                (1 - alpha)) /
              outputAlpha,
          );
  }
  png.data[index + 3] = Math.round(outputAlpha * 255);
}

function fillRoundedRect(
  png: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: Rgba,
) {
  const right = x + width;
  const bottom = y + height;
  for (let py = y; py < bottom; py += 1) {
    for (let px = x; px < right; px += 1) {
      const nearestX = Math.max(x + radius, Math.min(px, right - radius - 1));
      const nearestY = Math.max(y + radius, Math.min(py, bottom - radius - 1));
      const dx = px - nearestX;
      const dy = py - nearestY;
      if (dx * dx + dy * dy <= radius * radius) {
        blendPixel(png, px, py, color);
      }
    }
  }
}

function measureText(text: string, pixelSize: number) {
  return Math.max(
    0,
    [...text].reduce(
      (width, character) =>
        width + ((GLYPHS[character]?.[0].length ?? 3) + 1) * pixelSize,
      -pixelSize,
    ),
  );
}

function drawText(
  png: PNG,
  text: string,
  centerX: number,
  top: number,
  pixelSize: number,
  color: Rgba,
) {
  let cursorX = Math.round(centerX - measureText(text, pixelSize) / 2);
  for (const character of text) {
    const glyph = GLYPHS[character] ?? GLYPHS[' '];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] !== '1') {
          continue;
        }
        for (let dy = 0; dy < pixelSize; dy += 1) {
          for (let dx = 0; dx < pixelSize; dx += 1) {
            blendPixel(
              png,
              cursorX + column * pixelSize + dx,
              top + row * pixelSize + dy,
              color,
            );
          }
        }
      }
    }
    cursorX += (glyph[0].length + 1) * pixelSize;
  }
}

function downsample(source: PNG, width: number, height: number) {
  const output = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < SCALE; sy += 1) {
        for (let sx = 0; sx < SCALE; sx += 1) {
          const index =
            (source.width * (y * SCALE + sy) + x * SCALE + sx) << 2;
          for (let channel = 0; channel < 4; channel += 1) {
            totals[channel] += source.data[index + channel];
          }
        }
      }
      const outputIndex = (width * y + x) << 2;
      for (let channel = 0; channel < 4; channel += 1) {
        output.data[outputIndex + channel] = Math.round(
          totals[channel] / (SCALE * SCALE),
        );
      }
    }
  }
  return output;
}

export function createParkingMarkerPng(input: MarkerPngInput) {
  const dimensions = getMarkerDimensions(input.type, input.zoom);
  const palette = PALETTES[input.colorStatus];
  const width = dimensions.width * SCALE;
  const height = dimensions.height * SCALE;
  const markerWidth = dimensions.markerWidth * SCALE;
  const markerHeight = dimensions.markerHeight * SCALE;
  const radius =
    (input.type === 'spot'
      ? dimensions.markerWidth / 2
      : Math.min(28, dimensions.markerHeight / 2)) * SCALE;
  const png = new PNG({ width, height, colorType: 6 });

  fillRoundedRect(png, 0, 0, width, height, radius + 5 * SCALE, palette.aura);
  fillRoundedRect(
    png,
    4 * SCALE,
    4 * SCALE,
    markerWidth + 2 * SCALE,
    markerHeight + 2 * SCALE,
    radius + SCALE,
    [255, 255, 255, 235],
  );
  fillRoundedRect(
    png,
    5 * SCALE,
    5 * SCALE,
    markerWidth,
    markerHeight,
    radius,
    palette.surface,
  );

  const percentage = `${input.availabilityPercent}%`;
  if (input.type === 'spot') {
    drawText(
      png,
      percentage,
      width / 2,
      Math.round((height - 5 * 3 * SCALE) / 2),
      3 * SCALE,
      palette.text,
    );
  } else {
    drawText(
      png,
      'P',
      width / 2,
      13 * SCALE,
      6 * SCALE,
      palette.text,
    );
    drawText(
      png,
      'spots',
      width / 2,
      49 * SCALE,
      2 * SCALE,
      palette.secondary,
    );
  }

  return PNG.sync.write(downsample(png, dimensions.width, dimensions.height));
}
