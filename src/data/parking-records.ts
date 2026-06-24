import { parkingData } from '@/data/munich_parking';
import type { ParkingMapRecord } from '@/types/parking-map';

const MOCK_UPDATED_AT = '2026-06-24T00:00:00.000Z';

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function zoneIdFor(entry: (typeof parkingData)[number], index: number) {
  const source = entry.prm.trim() || entry.strasse.trim() || `zone-${index}`;
  return source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function priceFor(group: string) {
  if (group.startsWith('Kurzzeitparken')) {
    return 2.5;
  }
  if (group.startsWith('Mischparken')) {
    return 2;
  }
  if (group.startsWith('Altstadt')) {
    return 3;
  }
  return null;
}

function maxStayFor(description: string) {
  const match = description.match(/(\d+)\s*h/i);
  return match ? Number(match[1]) * 60 : null;
}

export const mockParkingRecords: ParkingMapRecord[] = parkingData.flatMap(
  (entry, index) => {
    if (entry.lat === null || entry.lon === null || entry.angebot <= 0) {
      return [];
    }

    const capacity = entry.angebot;
    const seed = hashString(`${entry.strasse}:${entry.prm}:${index}`);
    const available = seed % (capacity + 1);
    const availabilityPercent = Math.round((available / capacity) * 100);
    const zoneId = zoneIdFor(entry, index);

    return [
      {
        id: String(index),
        latitude: entry.lat,
        longitude: entry.lon,
        zoneId,
        zoneName: entry.prm.trim() || entry.strasse,
        capacity,
        available,
        availabilityPercent,
        updatedAt: MOCK_UPDATED_AT,
        pricePerHour: priceFor(entry.gruppe),
        maxStay: maxStayFor(entry.beschreibung),
        restrictions: entry.beschreibung,
        type: 'zone',
      },
    ];
  },
);
