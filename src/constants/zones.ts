import { C } from '@/constants/theme';

export type Freshness = 'fresh' | 'aging' | 'none';

export type Zone = {
  id: string;
  name: string;
  area: string;
  rule: string;
  price: string;
  hourlyRate: number;
  lat: number;
  lon: number;
  /** Likelihood of finding a spot, 0-100. Null when there isn't enough data to show one. */
  pct: number | null;
  /** Human-readable freshness of the last report, e.g. "3 min" or "no reports". */
  age: string;
  reports: number;
  freshness: Freshness;
  ev: boolean;
};

export const ZONES: Zone[] = [
  {
    id: 'haidhausen',
    name: 'Haidhausen Nord',
    area: 'Near Maximilianeum',
    rule: 'Max 2h · resident permit after 19:00',
    price: '€2.60/hr',
    hourlyRate: 2.6,
    lat: 48.1308,
    lon: 11.6021,
    pct: 72,
    age: '3 min',
    reports: 4,
    freshness: 'fresh',
    ev: true,
  },
  {
    id: 'glockenbach',
    name: 'Glockenbachviertel',
    area: 'Evening permit zone',
    rule: 'Paid until 23:00 · high turnover',
    price: '€3.20/hr',
    hourlyRate: 3.2,
    lat: 48.1262,
    lon: 11.5740,
    pct: 43,
    age: '18 min',
    reports: 2,
    freshness: 'aging',
    ev: false,
  },
  {
    id: 'maxvorstadt',
    name: 'Maxvorstadt',
    area: 'University streets',
    rule: 'Not enough data for this hour bucket',
    price: '€2.90/hr',
    hourlyRate: 2.9,
    lat: 48.1497,
    lon: 11.5689,
    pct: null,
    age: 'no reports',
    reports: 0,
    freshness: 'none',
    ev: true,
  },
  {
    id: 'sendling',
    name: 'Sendling Tor',
    area: 'Lindwurmstraße corridor',
    rule: 'EV bays on Lindwurmstraße',
    price: '€2.80/hr',
    hourlyRate: 2.8,
    lat: 48.1244,
    lon: 11.5663,
    pct: 61,
    age: '7 min',
    reports: 3,
    freshness: 'fresh',
    ev: true,
  },
];

export function confidenceTone(pct: number | null): string {
  if (pct === null) return C.unknown;
  if (pct >= 68) return C.high;
  if (pct >= 52) return C.mid;
  return C.low;
}

export function confidenceOpacity(freshness: Freshness): number {
  if (freshness === 'aging') return 0.62;
  if (freshness === 'none') return 0.75;
  return 1;
}

export function zoneById(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}
