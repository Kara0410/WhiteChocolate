export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
      parking_zones: {
        Row: {
          einzeluebersicht_link: string | null;
          eroeffnung: string | null;
          fid: number | null;
          geojson: Json | null;
          geom: unknown;
          id: string;
          massnahme: string | null;
          name: string | null;
          status: string | null;
          ueberwachung: string | null;
        };
        Insert: {
          einzeluebersicht_link?: string | null;
          eroeffnung?: string | null;
          fid?: number | null;
          geojson?: Json | null;
          geom?: unknown;
          id?: string;
          massnahme?: string | null;
          name?: string | null;
          status?: string | null;
          ueberwachung?: string | null;
        };
        Update: {
          einzeluebersicht_link?: string | null;
          eroeffnung?: string | null;
          fid?: number | null;
          geojson?: Json | null;
          geom?: unknown;
          id?: string;
          massnahme?: string | null;
          name?: string | null;
          status?: string | null;
          ueberwachung?: string | null;
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

export type ParkingZoneRow =
  Database['public']['Tables']['parking_zones']['Row'];
