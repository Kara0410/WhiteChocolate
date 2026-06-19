export type Zone = {
  id: string;
  name: string;
  area: string;
  price: string;
  hourlyRate: number;
  open: number;
  total: number;
  walk: string;
  rule: string;
  x: number;
  y: number;
};

export const ZONES: Zone[] = [
  { id: 'oldtown',  name: 'Altstadt Ring',      area: 'Near Marienplatz',     price: '€3.20/h', hourlyRate: 3.2, open: 2,  total: 50,  walk: '4 min',  rule: 'Max 2h',           x: 58, y: 42 },
  { id: 'isartor',  name: 'Isartor Ost',         area: 'Museum quarter edge',  price: '€2.60/h', hourlyRate: 2.6, open: 41, total: 80,  walk: '7 min',  rule: 'EV bays',          x: 73, y: 56 },
  { id: 'glocken',  name: 'Glockenbach Süd',     area: 'Evening permit zone',  price: '€2.10/h', hourlyRate: 2.1, open: 9,  total: 36,  walk: '10 min', rule: 'Permit after 19:00', x: 41, y: 66 },
  { id: 'maxvor',   name: 'Maxvorstadt Nord',    area: 'University streets',   price: '€1.90/h', hourlyRate: 1.9, open: 89, total: 116, walk: '12 min', rule: 'Low emission',     x: 32, y: 31 },
];

export function availabilityPercent(zone: Zone): number {
  return Math.max(0, Math.min(100, Math.round((zone.open / zone.total) * 100)));
}

export function availabilityTone(zone: Zone): { color: string; label: string } {
  const pct = availabilityPercent(zone);
  if (pct <= 5)  return { color: '#D92D20', label: 'Critical' };
  if (pct <= 50) return { color: '#FF9F0A', label: 'Limited'  };
  return               { color: '#34C759', label: 'Good'     };
}

export function availabilityEstimate(zone: Zone): string {
  return `~${availabilityPercent(zone)}% available`;
}
