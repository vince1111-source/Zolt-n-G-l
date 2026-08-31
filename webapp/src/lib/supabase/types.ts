export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_naplo: {
        Row: {
          bemenet: Json | null
          ceg_id: string
          felhasznalo_id: string | null
          id: string
          ido: string
          javasolt_muvelet_id: string | null
          kimenet: Json | null
          koltseg_ft: number | null
          modell: string | null
          muvelet: string
          reteg: number
          token_be: number | null
          token_ki: number | null
        }
        Insert: {
          bemenet?: Json | null
          ceg_id?: string
          felhasznalo_id?: string | null
          id?: string
          ido?: string
          javasolt_muvelet_id?: string | null
          kimenet?: Json | null
          koltseg_ft?: number | null
          modell?: string | null
          muvelet: string
          reteg: number
          token_be?: number | null
          token_ki?: number | null
        }
        Update: {
          bemenet?: Json | null
          ceg_id?: string
          felhasznalo_id?: string | null
          id?: string
          ido?: string
          javasolt_muvelet_id?: string | null
          kimenet?: Json | null
          koltseg_ft?: number | null
          modell?: string | null
          muvelet?: string
          reteg?: number
          token_be?: number | null
          token_ki?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_naplo_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_naplo_felhasznalo_id_fkey"
            columns: ["felhasznalo_id"]
            isOneToOne: false
            referencedRelation: "felhasznalok"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_naplo_javasolt_muvelet_id_fkey"
            columns: ["javasolt_muvelet_id"]
            isOneToOne: false
            referencedRelation: "javasolt_muveletek"
            referencedColumns: ["id"]
          },
        ]
      }
      ajanlat_tetelek: {
        Row: {
          ajanlat_id: string
          egysegar: number
          id: string
          megnevezes: string
          mennyiseg: number
          mertekegyseg: string
          netto: number
          sorrend: number
          termek_id: string | null
        }
        Insert: {
          ajanlat_id: string
          egysegar: number
          id?: string
          megnevezes: string
          mennyiseg: number
          mertekegyseg: string
          netto: number
          sorrend?: number
          termek_id?: string | null
        }
        Update: {
          ajanlat_id?: string
          egysegar?: number
          id?: string
          megnevezes?: string
          mennyiseg?: number
          mertekegyseg?: string
          netto?: number
          sorrend?: number
          termek_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajanlat_tetelek_ajanlat_id_fkey"
            columns: ["ajanlat_id"]
            isOneToOne: false
            referencedRelation: "ajanlatok"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajanlat_tetelek_termek_id_fkey"
            columns: ["termek_id"]
            isOneToOne: false
            referencedRelation: "termek_arres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajanlat_tetelek_termek_id_fkey"
            columns: ["termek_id"]
            isOneToOne: false
            referencedRelation: "termekek"
            referencedColumns: ["id"]
          },
        ]
      }
      ajanlatok: {
        Row: {
          afa: number
          allapot: Database["public"]["Enums"]["ajanlat_allapot"]
          brutto: number
          ceg_id: string
          ervenyes_ig: string | null
          feltetelezesek: Json
          id: string
          kedvezmeny_szazalek: number
          kelt: string
          letrehozva: string
          netto: number
          partner_id: string
          sorszam: string
        }
        Insert: {
          afa?: number
          allapot?: Database["public"]["Enums"]["ajanlat_allapot"]
          brutto?: number
          ceg_id?: string
          ervenyes_ig?: string | null
          feltetelezesek?: Json
          id?: string
          kedvezmeny_szazalek?: number
          kelt?: string
          letrehozva?: string
          netto?: number
          partner_id: string
          sorszam: string
        }
        Update: {
          afa?: number
          allapot?: Database["public"]["Enums"]["ajanlat_allapot"]
          brutto?: number
          ceg_id?: string
          ervenyes_ig?: string | null
          feltetelezesek?: Json
          id?: string
          kedvezmeny_szazalek?: number
          kelt?: string
          letrehozva?: string
          netto?: number
          partner_id?: string
          sorszam?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajanlatok_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajanlatok_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerek"
            referencedColumns: ["id"]
          },
        ]
      }
      cegek: {
        Row: {
          adoszam: string | null
          bankszamla: string | null
          cim: string | null
          email: string | null
          id: string
          letrehozva: string
          logo_url: string | null
          nev: string
          telefon: string | null
        }
        Insert: {
          adoszam?: string | null
          bankszamla?: string | null
          cim?: string | null
          email?: string | null
          id?: string
          letrehozva?: string
          logo_url?: string | null
          nev: string
          telefon?: string | null
        }
        Update: {
          adoszam?: string | null
          bankszamla?: string | null
          cim?: string | null
          email?: string | null
          id?: string
          letrehozva?: string
          logo_url?: string | null
          nev?: string
          telefon?: string | null
        }
        Relationships: []
      }
      dokumentumok: {
        Row: {
          ceg_id: string
          eredeti_nev: string | null
          fajl_url: string
          feltoltotte_id: string | null
          feltoltve: string
          id: string
          tipus: string
        }
        Insert: {
          ceg_id?: string
          eredeti_nev?: string | null
          fajl_url: string
          feltoltotte_id?: string | null
          feltoltve?: string
          id?: string
          tipus: string
        }
        Update: {
          ceg_id?: string
          eredeti_nev?: string | null
          fajl_url?: string
          feltoltotte_id?: string | null
          feltoltve?: string
          id?: string
          tipus?: string
        }
        Relationships: [
          {
            foreignKeyName: "dokumentumok_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumentumok_feltoltotte_id_fkey"
            columns: ["feltoltotte_id"]
            isOneToOne: false
            referencedRelation: "felhasznalok"
            referencedColumns: ["id"]
          },
        ]
      }
      feladatok: {
        Row: {
          allapot: Database["public"]["Enums"]["feladat_allapot"]
          ceg_id: string
          cim: string
          forras: string
          hatarido: string | null
          id: string
          leiras: string | null
          letrehozva: string
          partner_id: string | null
          surgos: boolean
        }
        Insert: {
          allapot?: Database["public"]["Enums"]["feladat_allapot"]
          ceg_id?: string
          cim: string
          forras?: string
          hatarido?: string | null
          id?: string
          leiras?: string | null
          letrehozva?: string
          partner_id?: string | null
          surgos?: boolean
        }
        Update: {
          allapot?: Database["public"]["Enums"]["feladat_allapot"]
          ceg_id?: string
          cim?: string
          forras?: string
          hatarido?: string | null
          id?: string
          leiras?: string | null
          letrehozva?: string
          partner_id?: string | null
          surgos?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feladatok_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feladatok_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerek"
            referencedColumns: ["id"]
          },
        ]
      }
      felhasznalok: {
        Row: {
          auth_user_id: string | null
          ceg_id: string
          email: string
          id: string
          letrehozva: string
          nev: string
          szerep: Database["public"]["Enums"]["felhasznalo_szerep"]
        }
        Insert: {
          auth_user_id?: string | null
          ceg_id: string
          email: string
          id?: string
          letrehozva?: string
          nev: string
          szerep?: Database["public"]["Enums"]["felhasznalo_szerep"]
        }
        Update: {
          auth_user_id?: string | null
          ceg_id?: string
          email?: string
          id?: string
          letrehozva?: string
          nev?: string
          szerep?: Database["public"]["Enums"]["felhasznalo_szerep"]
        }
        Relationships: [
          {
            foreignKeyName: "felhasznalok_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
        ]
      }
      javasolt_muveletek: {
        Row: {
          allapot: Database["public"]["Enums"]["muvelet_allapot"]
          ceg_id: string
          hiba_uzenet: string | null
          hivatkozott_id: string | null
          hivatkozott_tabla: string
          id: string
          javaslat: Json
          javasolva: string
          jovahagyta_id: string | null
          jovahagyva: string | null
          tipus: Database["public"]["Enums"]["muvelet_tipus"]
          vegrehajtva: string | null
        }
        Insert: {
          allapot?: Database["public"]["Enums"]["muvelet_allapot"]
          ceg_id?: string
          hiba_uzenet?: string | null
          hivatkozott_id?: string | null
          hivatkozott_tabla: string
          id?: string
          javaslat: Json
          javasolva?: string
          jovahagyta_id?: string | null
          jovahagyva?: string | null
          tipus: Database["public"]["Enums"]["muvelet_tipus"]
          vegrehajtva?: string | null
        }
        Update: {
          allapot?: Database["public"]["Enums"]["muvelet_allapot"]
          ceg_id?: string
          hiba_uzenet?: string | null
          hivatkozott_id?: string | null
          hivatkozott_tabla?: string
          id?: string
          javaslat?: Json
          javasolva?: string
          jovahagyta_id?: string | null
          jovahagyva?: string | null
          tipus?: Database["public"]["Enums"]["muvelet_tipus"]
          vegrehajtva?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "javasolt_muveletek_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "javasolt_muveletek_jovahagyta_id_fkey"
            columns: ["jovahagyta_id"]
            isOneToOne: false
            referencedRelation: "felhasznalok"
            referencedColumns: ["id"]
          },
        ]
      }
      kiolvasott_mezok: {
        Row: {
          biztos: boolean
          ceg_id: string
          dokumentum_id: string
          ertek: string | null
          forras_leiras: string
          id: string
          javitott_ertek: string | null
          javitotta_id: string | null
          javitva: boolean
          javitva_ekkor: string | null
          mezo_nev: string
        }
        Insert: {
          biztos: boolean
          ceg_id?: string
          dokumentum_id: string
          ertek?: string | null
          forras_leiras: string
          id?: string
          javitott_ertek?: string | null
          javitotta_id?: string | null
          javitva?: boolean
          javitva_ekkor?: string | null
          mezo_nev: string
        }
        Update: {
          biztos?: boolean
          ceg_id?: string
          dokumentum_id?: string
          ertek?: string | null
          forras_leiras?: string
          id?: string
          javitott_ertek?: string | null
          javitotta_id?: string | null
          javitva?: boolean
          javitva_ekkor?: string | null
          mezo_nev?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiolvasott_mezok_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiolvasott_mezok_dokumentum_id_fkey"
            columns: ["dokumentum_id"]
            isOneToOne: false
            referencedRelation: "dokumentumok"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiolvasott_mezok_javitotta_id_fkey"
            columns: ["javitotta_id"]
            isOneToOne: false
            referencedRelation: "felhasznalok"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerek: {
        Row: {
          adoszam: string | null
          archivalt: boolean
          ceg_id: string
          cim: string | null
          email: string | null
          fizetesi_hatarido_nap: number
          id: string
          kapcsolattarto: string | null
          kedvezmeny_szazalek: number
          letrehozva: string
          megjegyzes: string | null
          nev: string
          szallito: boolean
          telefon: string | null
        }
        Insert: {
          adoszam?: string | null
          archivalt?: boolean
          ceg_id?: string
          cim?: string | null
          email?: string | null
          fizetesi_hatarido_nap?: number
          id?: string
          kapcsolattarto?: string | null
          kedvezmeny_szazalek?: number
          letrehozva?: string
          megjegyzes?: string | null
          nev: string
          szallito?: boolean
          telefon?: string | null
        }
        Update: {
          adoszam?: string | null
          archivalt?: boolean
          ceg_id?: string
          cim?: string | null
          email?: string | null
          fizetesi_hatarido_nap?: number
          id?: string
          kapcsolattarto?: string | null
          kedvezmeny_szazalek?: number
          letrehozva?: string
          megjegyzes?: string | null
          nev?: string
          szallito?: boolean
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnerek_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
        ]
      }
      szamlak: {
        Row: {
          afa: number | null
          allapot: Database["public"]["Enums"]["szamla_allapot"]
          brutto: number
          ceg_id: string
          dokumentum_id: string | null
          fizetesi_hatarido: string | null
          forras: Database["public"]["Enums"]["adat_forras"]
          id: string
          irany: Database["public"]["Enums"]["szamla_irany"]
          kelt: string | null
          kulso_azonosito: string | null
          letrehozva: string
          netto: number | null
          partner_id: string | null
          penznem: string
          sorszam: string
          teljesites: string | null
        }
        Insert: {
          afa?: number | null
          allapot?: Database["public"]["Enums"]["szamla_allapot"]
          brutto: number
          ceg_id?: string
          dokumentum_id?: string | null
          fizetesi_hatarido?: string | null
          forras: Database["public"]["Enums"]["adat_forras"]
          id?: string
          irany: Database["public"]["Enums"]["szamla_irany"]
          kelt?: string | null
          kulso_azonosito?: string | null
          letrehozva?: string
          netto?: number | null
          partner_id?: string | null
          penznem?: string
          sorszam: string
          teljesites?: string | null
        }
        Update: {
          afa?: number | null
          allapot?: Database["public"]["Enums"]["szamla_allapot"]
          brutto?: number
          ceg_id?: string
          dokumentum_id?: string | null
          fizetesi_hatarido?: string | null
          forras?: Database["public"]["Enums"]["adat_forras"]
          id?: string
          irany?: Database["public"]["Enums"]["szamla_irany"]
          kelt?: string | null
          kulso_azonosito?: string | null
          letrehozva?: string
          netto?: number | null
          partner_id?: string | null
          penznem?: string
          sorszam?: string
          teljesites?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "szamlak_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "szamlak_dokumentum_id_fkey"
            columns: ["dokumentum_id"]
            isOneToOne: false
            referencedRelation: "dokumentumok"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "szamlak_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partnerek"
            referencedColumns: ["id"]
          },
        ]
      }
      termekek: {
        Row: {
          afa_kulcs: number
          aktiv: boolean
          beszerzesi_ar: number
          ceg_id: string
          cikkszam: string | null
          eladasi_ar: number
          id: string
          kategoria: Database["public"]["Enums"]["termek_kategoria"]
          letrehozva: string
          mertekegyseg: string
          nev: string
        }
        Insert: {
          afa_kulcs?: number
          aktiv?: boolean
          beszerzesi_ar?: number
          ceg_id?: string
          cikkszam?: string | null
          eladasi_ar: number
          id?: string
          kategoria?: Database["public"]["Enums"]["termek_kategoria"]
          letrehozva?: string
          mertekegyseg: string
          nev: string
        }
        Update: {
          afa_kulcs?: number
          aktiv?: boolean
          beszerzesi_ar?: number
          ceg_id?: string
          cikkszam?: string | null
          eladasi_ar?: number
          id?: string
          kategoria?: Database["public"]["Enums"]["termek_kategoria"]
          letrehozva?: string
          mertekegyseg?: string
          nev?: string
        }
        Relationships: [
          {
            foreignKeyName: "termekek_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      termek_arres: {
        Row: {
          arres: number | null
          arres_szazalek: number | null
          ceg_id: string | null
          id: string | null
          nev: string | null
        }
        Insert: {
          arres?: never
          arres_szazalek?: never
          ceg_id?: string | null
          id?: string | null
          nev?: string | null
        }
        Update: {
          arres?: never
          arres_szazalek?: never
          ceg_id?: string | null
          id?: string | null
          nev?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termekek_ceg_id_fkey"
            columns: ["ceg_id"]
            isOneToOne: false
            referencedRelation: "cegek"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aktualis_ceg: { Args: Record<string, never>; Returns: string }
      sajat_ceg_letrehozasa: {
        Args: { p_ceg_nev: string; p_felhasznalo_nev: string }
        Returns: string
      }
    }
    Enums: {
      adat_forras: "nav" | "foto" | "kezi" | "szamlazo_api"
      ajanlat_allapot:
        | "piszkozat"
        | "kikuldve"
        | "elfogadva"
        | "elutasitva"
        | "lejart"
      feladat_allapot: "nyitott" | "kesz" | "torolve"
      felhasznalo_szerep: "tulajdonos" | "munkatars"
      muvelet_allapot:
        | "javasolt"
        | "jovahagyott"
        | "vegrehajtott"
        | "kihagyott"
        | "elvetett"
      muvelet_tipus:
        | "ajanlat_kikuldes"
        | "emlekezteto"
        | "email"
        | "utalasi_javaslat"
      szamla_allapot: "nyitott" | "fizetve" | "sztornozott"
      szamla_irany: "kimeno" | "bejovo"
      termek_kategoria: "munkadij" | "anyag" | "szolgaltatas"
    }
    CompositeTypes: Record<string, never>
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adat_forras: ["nav", "foto", "kezi", "szamlazo_api"],
      ajanlat_allapot: [
        "piszkozat",
        "kikuldve",
        "elfogadva",
        "elutasitva",
        "lejart",
      ],
      feladat_allapot: ["nyitott", "kesz", "torolve"],
      felhasznalo_szerep: ["tulajdonos", "munkatars"],
      muvelet_allapot: [
        "javasolt",
        "jovahagyott",
        "vegrehajtott",
        "kihagyott",
        "elvetett",
      ],
      muvelet_tipus: [
        "ajanlat_kikuldes",
        "emlekezteto",
        "email",
        "utalasi_javaslat",
      ],
      szamla_allapot: ["nyitott", "fizetve", "sztornozott"],
      szamla_irany: ["kimeno", "bejovo"],
      termek_kategoria: ["munkadij", "anyag", "szolgaltatas"],
    },
  },
} as const
