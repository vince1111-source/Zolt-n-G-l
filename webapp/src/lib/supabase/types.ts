export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
