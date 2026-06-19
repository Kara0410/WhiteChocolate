// Reads the Munich open data CSV, deduplicates by street, converts UTM32N → WGS84, outputs TS.
const fs = require('fs');
const path = require('path');

// Usage: node scripts/generate-parking-data.js path/to/munich_open_data_portal.csv
// Falls back to data-source/munich_open_data_portal.csv relative to the repo root.
const CSV_PATH = process.argv[2] ?? path.join(__dirname, '..', 'data-source', 'munich_open_data_portal.csv');
if (!process.argv[2] && !require('fs').existsSync(CSV_PATH)) {
  console.error('Usage: node scripts/generate-parking-data.js <path-to-csv>');
  process.exit(1);
}
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'munich_parking.ts');

function parseCSV(text) {
  const rows = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(field); field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.replace('\r', ''));
    rows.push(fields);
  }
  return rows;
}

function utmToLatLon(easting, northing, zone = 32) {
  const a = 6378137.0;
  const eccSq = 0.00669437999014;
  const k0 = 0.9996;
  const e1 = (1 - Math.sqrt(1 - eccSq)) / (1 + Math.sqrt(1 - eccSq));
  const x = easting - 500000.0;
  const y = northing;
  const lon0 = (zone - 1) * 6 - 180 + 3;
  const eccPSq = eccSq / (1 - eccSq);
  const M = y / k0;
  const mu = M / (a * (1 - eccSq / 4 - 3 * eccSq ** 2 / 64 - 5 * eccSq ** 3 / 256));
  const p1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - eccSq * Math.sin(p1) ** 2);
  const T1 = Math.tan(p1) ** 2;
  const C1 = eccPSq * Math.cos(p1) ** 2;
  const R1 = a * (1 - eccSq) / (1 - eccSq * Math.sin(p1) ** 2) ** 1.5;
  const D = x / (N1 * k0);
  let lat = p1 - (N1 * Math.tan(p1) / R1) * (
    D ** 2 / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * eccPSq) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * eccPSq - 3 * C1 ** 2) * D ** 6 / 720
  );
  lat = lat * 180 / Math.PI;
  let lon = (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * eccPSq + 24 * T1 ** 2) * D ** 5 / 120) / Math.cos(p1);
  lon = lon0 + lon * 180 / Math.PI;
  return { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 };
}

function firstCoord(shape) {
  const m = shape.match(/LINESTRING\s*\(\s*([\d.]+)\s+([\d.]+)/);
  if (!m) return null;
  return { easting: parseFloat(m[1]), northing: parseFloat(m[2]) };
}

const text = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(text);
const hdr = rows[0];
const idx = (n) => hdr.indexOf(n);
const iStr = idx('strasse'), iGrp = idx('parkregel_gruppe'), iBes = idx('parkregel_beschreibung');
const iPrm = idx('prm_name'), iAng = idx('angebot'), iShp = idx('shape');

const seen = new Set();
const entries = [];

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (r.length <= iShp) continue;
  const strasse = r[iStr].trim();
  if (!strasse || seen.has(strasse)) continue;
  seen.add(strasse);
  const coord = firstCoord(r[iShp]);
  let lat = null, lon = null;
  if (coord) ({ lat, lon } = utmToLatLon(coord.easting, coord.northing));
  entries.push({
    strasse,
    gruppe: r[iGrp].trim(),
    beschreibung: r[iBes].trim(),
    prm: r[iPrm].trim(),
    angebot: parseInt(r[iAng]) || 0,
    lat,
    lon,
  });
}

entries.sort((a, b) => a.strasse.localeCompare(b.strasse, 'de'));

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const lines = [
  'export type ParkingEntry = {',
  '  strasse: string;',
  '  gruppe: string;',
  '  beschreibung: string;',
  '  prm: string;',
  '  angebot: number;',
  '  lat: number | null;',
  '  lon: number | null;',
  '};',
  '',
  'export const parkingData: ParkingEntry[] = [',
  ...entries.map(e =>
    `  { strasse: "${esc(e.strasse)}", gruppe: "${esc(e.gruppe)}", beschreibung: "${esc(e.beschreibung)}", prm: "${esc(e.prm)}", angebot: ${e.angebot}, lat: ${e.lat}, lon: ${e.lon} },`
  ),
  '];',
];

fs.writeFileSync(OUT_PATH, lines.join('\r\n'), 'utf8');
console.log(`Written ${entries.length} entries to ${OUT_PATH}`);
