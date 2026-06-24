import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';
import Supercluster from 'supercluster';

import {
  displayAvailabilityPercent,
  getMarkerDimensions,
  getMarkerSizeTier,
  markerImageKey,
  MARKER_PALETTES,
  zoneCountLabel,
} from '../src/components/parking-map/marker-visuals';
import { mockParkingRecords } from '../src/data/parking-records';
import type {
  AvailabilityColorStatus,
  ParkingClusterResponse,
} from '../src/types/parking-map';
import { getAvailabilityColorStatus } from '../src/utils/parking-map-geo';

type VisualSpec = Pick<
  ParkingClusterResponse,
  'availabilityPercent' | 'colorStatus' | 'type' | 'zoneCount'
> & {
  zoom: number;
  selected: boolean;
};

type PointProperties = {
  capacity: number;
  available: number;
  zoneId: string;
};

type AggregateProperties = {
  capacity: number;
  available: number;
  zoneIds: string[];
};

const outputDirectory = join(
  process.cwd(),
  'assets',
  'images',
  'parking-markers',
);
const manifestPath = join(
  process.cwd(),
  'src',
  'components',
  'parking-map',
  'parking-marker-assets.generated.ts',
);
const radii = [20, 40, 60, 80, 100, 120, 160, 200];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

function markerSvg(spec: VisualSpec) {
  const tier = getMarkerSizeTier(spec.type, spec.zoom);
  const dimensions = getMarkerDimensions(tier, spec.selected);
  const palette = MARKER_PALETTES[spec.colorStatus];
  const displayedPercentage = displayAvailabilityPercent(
    spec.availabilityPercent,
  );
  const center = dimensions.canvasSize / 2;
  const radius = dimensions.visualSize / 2;
  const ringRadius = radius - (tier === 'spot' ? 3 : 4);
  const circumference = 2 * Math.PI * ringRadius;
  const progress = Math.max(0.04, displayedPercentage / 100);
  const dash = circumference * progress;
  const gap = circumference - dash;
  const percentageSize =
    tier === 'large'
      ? 132
      : tier === 'medium'
        ? 116
        : tier === 'small'
          ? 100
          : 76;
  const zoneSize = tier === 'large' ? 48 : tier === 'medium' ? 44 : 40;
  const percentageY =
    tier === 'spot' ? center + 20 : center - (tier === 'small' ? 8 : 12);
  const zoneY = center + (tier === 'small' ? 76 : tier === 'medium' ? 88 : 100);
  const glowDeviation = spec.selected ? 36 : tier === 'spot' ? 16 : 28;
  const shadowOpacity = spec.selected ? 0.2 : 0.13;
  const zoneLabel =
    spec.type === 'cluster' ? zoneCountLabel(spec.zoneCount ?? 0) : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.canvasSize}" height="${dimensions.canvasSize}" viewBox="0 0 ${dimensions.canvasSize} ${dimensions.canvasSize}">
      <defs>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="${glowDeviation}" />
        </filter>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="220%">
          <feDropShadow dx="0" dy="${tier === 'spot' ? 3 : 6}" stdDeviation="${tier === 'spot' ? 3 : 7}" flood-color="#09111F" flood-opacity="${shadowOpacity}" />
        </filter>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.96" />
          <stop offset="1" stop-color="#F7FAFC" stop-opacity="0.78" />
        </linearGradient>
        <linearGradient id="color" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.98" />
          <stop offset="1" stop-color="${palette.accentSoft}" stop-opacity="0.38" />
        </linearGradient>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius + (spec.selected ? 5 : 3)}" fill="${palette.accent}" opacity="${spec.selected ? 0.34 : 0.24}" filter="url(#glow)" />
      <g filter="url(#shadow)">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#glass)" stroke="#FFFFFF" stroke-opacity="${spec.selected ? 1 : 0.9}" stroke-width="${spec.selected ? 2 : 1}" />
        <circle cx="${center}" cy="${center}" r="${radius - 8}" fill="url(#color)" fill-opacity="0.98" />
        <circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="${palette.accent}" stroke-opacity="0.2" stroke-width="${tier === 'spot' ? 8 : 12}" />
        <circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="${palette.accent}" stroke-opacity="0.98" stroke-width="${tier === 'spot' ? 8 : 12}" stroke-linecap="round" stroke-dasharray="${dash} ${gap}" transform="rotate(-90 ${center} ${center})" />
        <ellipse cx="${center - radius * 0.22}" cy="${center - radius * 0.34}" rx="${radius * 0.45}" ry="${radius * 0.18}" fill="#FFFFFF" opacity="0.14" transform="rotate(-20 ${center} ${center})" />
        <text x="${center}" y="${percentageY + 4}" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" fill-opacity="0.72" font-family="SF Pro Display, Arial, sans-serif" font-size="${percentageSize}" font-weight="800" letter-spacing="-1.6">${displayedPercentage}%</text>
        <text x="${center}" y="${percentageY}" text-anchor="middle" dominant-baseline="middle" fill="${palette.text}" font-family="SF Pro Display, Arial, sans-serif" font-size="${percentageSize}" font-weight="800" letter-spacing="-1.6">${displayedPercentage}%</text>
        ${
          spec.type === 'cluster'
            ? `<text x="${center}" y="${zoneY}" text-anchor="middle" dominant-baseline="middle" fill="${palette.text}" fill-opacity="0.74" font-family="SF Pro Text, Arial, sans-serif" font-size="${zoneSize}" font-weight="650">${escapeXml(zoneLabel)}</text>`
            : ''
        }
      </g>
    </svg>
  `.trim();
}

function collectVisualSpecs() {
  const specs = new Map<string, VisualSpec>();
  const add = (
    item: Pick<
      ParkingClusterResponse,
      'availabilityPercent' | 'colorStatus' | 'type' | 'zoneCount'
    >,
    zoom: number,
  ) => {
    for (const selected of [false, true]) {
      const spec = { ...item, zoom, selected };
      specs.set(markerImageKey(item, zoom, selected), spec);
    }
  };

  for (const record of mockParkingRecords) {
    add(
      {
        type: 'spot',
        availabilityPercent: record.availabilityPercent,
        colorStatus: getAvailabilityColorStatus(record.availabilityPercent),
        zoneCount: 1,
      },
      18,
    );
  }

  for (const radius of radii) {
    const index = new Supercluster<PointProperties, AggregateProperties>({
      minZoom: 0,
      maxZoom: 18,
      radius,
      extent: 512,
      nodeSize: 64,
      minPoints: 2,
      map: (properties) => ({
        capacity: properties.capacity,
        available: properties.available,
        zoneIds: [properties.zoneId],
      }),
      reduce: (accumulated, next) => {
        accumulated.capacity += next.capacity;
        accumulated.available += next.available;
        accumulated.zoneIds = [
          ...new Set([...accumulated.zoneIds, ...next.zoneIds]),
        ];
      },
    }).load(
      mockParkingRecords.map((record) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [record.longitude, record.latitude],
        },
        properties: {
          capacity: record.capacity,
          available: record.available,
          zoneId: record.zoneId,
        },
      })),
    );

    for (let zoom = 0; zoom <= 18; zoom += 1) {
      const features = index.getClusters([-180, -85, 180, 85], zoom);
      for (const feature of features) {
        if (!('cluster' in feature.properties)) {
          continue;
        }
        const availabilityPercent =
          feature.properties.capacity === 0
            ? 0
            : Math.round(
                (feature.properties.available / feature.properties.capacity) *
                  100,
              );
        add(
          {
            type: 'cluster',
            availabilityPercent,
            colorStatus: getAvailabilityColorStatus(availabilityPercent),
            zoneCount: feature.properties.zoneIds.length,
          },
          zoom,
        );
      }
    }
  }

  return specs;
}

async function main() {
  const specs = collectVisualSpecs();
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });

  const manifestLines = [
    '/* This file is generated by npm run generate:parking-markers. */',
    '',
    'export const PARKING_MARKER_ASSETS: Record<string, number> = {',
  ];
  let index = 0;

  for (const [key, spec] of specs) {
    const fileName = `marker-${String(index).padStart(4, '0')}.webp`;
    await sharp(Buffer.from(markerSvg(spec)))
      .webp({ quality: 86, alphaQuality: 96, smartSubsample: true })
      .toFile(join(outputDirectory, fileName));
    manifestLines.push(
      `  ${JSON.stringify(key)}: require('../../../assets/images/parking-markers/${fileName}'),`,
    );
    index += 1;
  }

  manifestLines.push('};', '');
  writeFileSync(manifestPath, manifestLines.join('\n'));
  console.log(`Generated ${specs.size} parking marker assets.`);
}

void main();
