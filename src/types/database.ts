export type Database = {
  public: {
    Tables: {
      parking_segments: {
        Row: {
          FID: string | null;
          angebot: number | null;
          created_at: string;
          geoportal_class: string | null;
          id: string;
          lat: number | null;
          lon: number | null;
          parkregel_beschreibung: string | null;
          parkregel_gruppe: string | null;
          parkregel_id: number | null;
          parkregel_name: string | null;
          prm_name: string | null;
          shape: string | null;
          strasse: string | null;
          updated_at: string;
        };
        Insert: {
          FID?: string | null;
          angebot?: number | null;
          created_at?: string;
          geoportal_class?: string | null;
          id?: string;
          lat?: number | null;
          lon?: number | null;
          parkregel_beschreibung?: string | null;
          parkregel_gruppe?: string | null;
          parkregel_id?: number | null;
          parkregel_name?: string | null;
          prm_name?: string | null;
          shape?: string | null;
          strasse?: string | null;
          updated_at?: string;
        };
        Update: {
          FID?: string | null;
          angebot?: number | null;
          created_at?: string;
          geoportal_class?: string | null;
          id?: string;
          lat?: number | null;
          lon?: number | null;
          parkregel_beschreibung?: string | null;
          parkregel_gruppe?: string | null;
          parkregel_id?: number | null;
          parkregel_name?: string | null;
          prm_name?: string | null;
          shape?: string | null;
          strasse?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type ParkingSegmentRow =
  Database['public']['Tables']['parking_segments']['Row'];
