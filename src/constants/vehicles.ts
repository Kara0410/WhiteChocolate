export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  note: string;
};

export type HistoryEntry = {
  street: string;
  time: string;
  plate: string;
  cost: string;
  status: string;
};

export const VEHICLES: Vehicle[] = [
  { id: 'bmw',  name: 'BMW i4 eDrive40', plate: 'M-PM 8241', note: 'EV · resident permit'    },
  { id: 'golf', name: 'VW Golf',          plate: 'M-QE 1120', note: 'Guest · green sticker'   },
];

export const HISTORY: HistoryEntry[] = [
  { street: 'Sonnenstraße 18',  time: 'Today · 18:20–20:00',      plate: 'M-PM 8241', cost: '€5.40', status: 'Active' },
  { street: 'Frauenstraße 6',   time: 'Yesterday · 09:10–10:35',  plate: 'M-PM 8241', cost: '€4.15', status: 'Paid'   },
  { street: 'Arcisstraße 21',   time: 'Mon · 13:00–15:15',        plate: 'M-QE 1120', cost: '€4.35', status: 'Paid'   },
];
