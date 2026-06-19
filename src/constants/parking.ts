/**
 * App-wide constants for parking data display.
 *
 * Kept in one place so the list screen and detail screen always use identical
 * colours and sizes — change here, both screens update automatically.
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/**
 * Maps parking-group prefixes to their accent colour.
 * Prefix matching (startsWith) is used so sub-types like
 * "Mischparken mit Parkscheibe" still resolve to the Mischparken colour.
 */
export const BADGE_COLORS: Record<string, string> = {
  Bewohnerparken:          '#ffd33d', // gold   — residents only
  Kurzzeitparken:          '#60a5fa', // blue   — short-term / pay & display
  Mischparken:             '#34d399', // green  — mixed-use zones
  'E-Parken':              '#22d3ee', // cyan   — EV charging bays
  Behindertenparken:       '#a78bfa', // purple — disabled badge holders
  'Absolutes Halteverbot': '#f87171', // red    — no stopping at all
};

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

/**
 * Definitions for the horizontal filter row on the list screen.
 * Each chip has an id (state key), display label, accent colour,
 * and a match function that tests a parking group string.
 */
export const FILTER_CHIPS = [
  {
    id:    'bewohner',
    label: 'Residents',
    color: '#ffd33d',
    match: (g: string) => g.startsWith('Bewohnerparken'),
  },
  {
    id:    'kurzzeit',
    label: 'Short-term',
    color: '#60a5fa',
    match: (g: string) => g.startsWith('Kurzzeitparken'),
  },
  {
    id:    'misch',
    label: 'Mixed',
    color: '#34d399',
    match: (g: string) => g.startsWith('Mischparken'),
  },
  {
    id:    'ev',
    label: 'EV',
    color: '#22d3ee',
    match: (g: string) => g.startsWith('E-Parken'),
  },
  {
    id:    'handicap',
    label: 'Disabled',
    color: '#a78bfa',
    match: (g: string) => g.startsWith('Behindertenparken'),
  },
  {
    id:    'free',
    label: 'Free',
    color: '#9ca3af',
    match: (g: string) => g.startsWith('keine Regelung'),
  },
] as const;

// ---------------------------------------------------------------------------
// Card / list layout
// ---------------------------------------------------------------------------

/**
 * FlatList uses getItemLayout to skip measuring items dynamically.
 * That requires knowing every item's exact pixel height upfront.
 * CARD_H_DIST is taller to accommodate the "X m away" distance row
 * that appears when location mode is active.
 *
 * ITEM_H* includes the marginBottom between cards so that scroll offsets
 * stay accurate as the user scrolls through all 1 700+ entries.
 */
export const CARD_H      = 122; // card body height — no distance row
export const CARD_H_DIST = 142; // card body height — with distance row
export const ITEM_MARGIN = 10;  // gap between cards
export const ITEM_H      = CARD_H      + ITEM_MARGIN; // total slot height (alpha mode)
export const ITEM_H_DIST = CARD_H_DIST + ITEM_MARGIN; // total slot height (location mode)
