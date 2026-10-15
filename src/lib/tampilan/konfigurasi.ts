/**
 * Konfigurasi tampilan publik (tema + susunan widget + popup + pemandu), berversi.
 * Data dari database SELALU dibaca lewat `bacaKonfigurasi()`: nilai tak dikenal dibuang, nilai rusak
 * kembali ke bawaan per kolom, dan versi lama dimigrasikan — sehingga halaman publik tidak pernah gagal
 * karena konfigurasi. Konfigurasi terbit disimpan di pengaturan_situs.tema.tampilan (publik);
 * draf di tabel tampilan_draf (hanya pengelola, RLS).
 */
import { z } from "zod";
import { FONT, GERAK, PALET, TEMA, type KunciTema } from "./token.ts";
import { DEFINISI_WIDGET, JENIS_WIDGET, PASANGAN, SUSUNAN_BAWAAN, pengaturanBawaan, type JenisWidget, type WidgetInstans } from "./widget.ts";

export const VERSI_KONFIGURASI = 1;
const MAKS_WIDGET = 20;

export type Konfigurasi = {
  versi: number;
  tema: Exclude<KunciTema, "editorial">;
  palet: keyof typeof PALET;
  font: keyof typeof FONT;
  gerak: keyof typeof GERAK;
  slideshow: { gaya: "manual" | "otomatis"; detik: number };
  popup: { prioritas: boolean; rutin: boolean };
  pemandu: { aktif: boolean };
  beranda: WidgetInstans[];
};

export const KONFIGURASI_BAWAAN: Konfigurasi = {
  versi: VERSI_KONFIGURASI,
  tema: "akademik",
  palet: "merah",
  font: "source-sans",
  gerak: "standar",
  slideshow: { gaya: "manual", detik: 8 },
  popup: { prioritas: true, rutin: true },
  pemandu: { aktif: true },
  beranda: SUSUNAN_BAWAAN,
};

const kunci = <T extends Record<string, unknown>>(obj: T) => Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];
const temaTersedia = (Object.keys(TEMA) as KunciTema[]).filter((k) => TEMA[k].tersedia) as [Konfigurasi["tema"], ...Konfigurasi["tema"][]];

const skemaAtas = z.object({
  tema: z.enum(temaTersedia).catch(KONFIGURASI_BAWAAN.tema),
  palet: z.enum(kunci(PALET)).catch(KONFIGURASI_BAWAAN.palet),
  font: z.enum(kunci(FONT)).catch(KONFIGURASI_BAWAAN.font),
  gerak: z.enum(kunci(GERAK)).catch(KONFIGURASI_BAWAAN.gerak),
  slideshow: z
    .object({ gaya: z.enum(["manual", "otomatis"]).catch("manual"), detik: z.number().int().min(7).max(15).catch(8) })
    .catch(KONFIGURASI_BAWAAN.slideshow),
  popup: z.object({ prioritas: z.boolean().catch(true), rutin: z.boolean().catch(true) }).catch(KONFIGURASI_BAWAAN.popup),
  pemandu: z.object({ aktif: z.boolean().catch(true) }).catch(KONFIGURASI_BAWAAN.pemandu),
});

const objek = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const ID_AMAN = /^[a-z0-9-]{1,40}$/;

/** Migrasi versi skema. Versi 0 (belum ada `versi`) = konfigurasi awal tanpa susunan beranda. */
function migrasi(raw: Record<string, unknown>): Record<string, unknown> {
  const versi = typeof raw.versi === "number" ? raw.versi : 0;
  if (versi < 1) return { ...raw, beranda: Array.isArray(raw.beranda) ? raw.beranda : SUSUNAN_BAWAAN };
  return raw;
}

/** Baca & bersihkan konfigurasi dari sumber mana pun (database, formulir). Tidak pernah melempar galat. */
export function bacaKonfigurasi(raw: unknown): Konfigurasi {
  const r = migrasi(objek(raw));
  const atas = skemaAtas.parse(r);
  const daftar = Array.isArray(r.beranda) ? r.beranda.slice(0, MAKS_WIDGET) : SUSUNAN_BAWAAN;
  const terpakai = new Set<string>();
  const beranda: WidgetInstans[] = [];
  for (const w of daftar) {
    const o = objek(w);
    const jenis = o.jenis as JenisWidget;
    if (!JENIS_WIDGET.includes(jenis)) continue; // jenis tak dikenal (mis. dari versi lebih baru) dilewati
    const def = DEFINISI_WIDGET[jenis];
    if (def.instans === "satu" && beranda.some((b) => b.jenis === jenis)) continue;
    let id = typeof o.id === "string" && ID_AMAN.test(o.id) ? o.id : jenis;
    for (let i = 2; terpakai.has(id); i++) id = `${jenis}-${i}`;
    terpakai.add(id);
    beranda.push({
      id,
      jenis,
      tampil: def.wajib ? true : o.tampil !== false,
      pengaturan: def.skema.parse(objek(o.pengaturan)) as Record<string, unknown>,
    });
  }
  // widget wajib (pembuka) selalu ada & selalu di urutan pertama
  const hero = beranda.findIndex((b) => b.jenis === "hero");
  if (hero === -1) beranda.unshift({ id: "hero", jenis: "hero", tampil: true, pengaturan: pengaturanBawaan("hero") });
  else if (hero > 0) beranda.unshift(...beranda.splice(hero, 1));
  return { versi: VERSI_KONFIGURASI, ...atas, beranda };
}

/** Tata letak yang dipakai: pilihan widget bila didukung tema, selain itu bawaan tema (fallback). */
export function tataEfektif(tema: KunciTema, w: WidgetInstans): string | undefined {
  const diminta = w.pengaturan.tata as string | undefined;
  const dukung = TEMA[tema].tata[w.jenis];
  if (!dukung || diminta === undefined) return diminta;
  return dukung.includes(diminta) ? diminta : dukung[0];
}

/** Peringatan untuk pratinjau: widget yang perlu penyesuaian setelah berganti tema. */
export function periksaKompatibilitas(k: Konfigurasi): string[] {
  const pesan: string[] = [];
  for (const w of k.beranda) {
    const diminta = w.pengaturan.tata as string | undefined;
    const pakai = tataEfektif(k.tema, w);
    if (w.tampil && diminta && pakai !== diminta)
      pesan.push(`${DEFINISI_WIDGET[w.jenis].label}: tata letak “${diminta}” tidak didukung tema ${TEMA[k.tema].label}; memakai “${pakai}”.`);
  }
  if (k.slideshow.gaya === "otomatis" && k.gerak === "minimal") pesan.push("Slideshow otomatis tetap berhenti bila pengunjung memilih kurangi gerak (reduced motion).");
  return pesan;
}

/** Kelompokkan widget yang tampil menjadi bagian halaman; pasangan yang bersebelahan digabung. */
export function susunBagian(k: Konfigurasi): WidgetInstans[][] {
  const tampil = k.beranda.filter((w) => w.tampil);
  const hasil: WidgetInstans[][] = [];
  for (let i = 0; i < tampil.length; i++) {
    const a = tampil[i];
    const b = tampil[i + 1];
    if (b && PASANGAN.some(([x, y]) => x === a.jenis && y === b.jenis)) {
      hasil.push([a, b]);
      i++;
    } else hasil.push([a]);
  }
  return hasil;
}

/* ---------- operasi editor (murni; dipakai UI & diuji) ---------- */

export function pindahkan(daftar: WidgetInstans[], dari: number, ke: number): WidgetInstans[] {
  if (dari === ke || dari < 0 || ke < 0 || dari >= daftar.length || ke >= daftar.length) return daftar;
  const salin = [...daftar];
  const [w] = salin.splice(dari, 1);
  salin.splice(ke, 0, w);
  // pembuka tetap pertama
  const h = salin.findIndex((x) => x.jenis === "hero");
  if (h > 0) salin.unshift(...salin.splice(h, 1));
  return salin;
}

export function bolehTambah(daftar: WidgetInstans[], jenis: JenisWidget) {
  return DEFINISI_WIDGET[jenis].instans === "banyak" || !daftar.some((w) => w.jenis === jenis);
}

export function tambahWidget(daftar: WidgetInstans[], jenis: JenisWidget): WidgetInstans[] {
  if (!bolehTambah(daftar, jenis) || daftar.length >= MAKS_WIDGET) return daftar;
  let id: string = jenis;
  for (let i = 2; daftar.some((w) => w.id === id); i++) id = `${jenis}-${i}`;
  return [...daftar, { id, jenis, tampil: true, pengaturan: pengaturanBawaan(jenis) }];
}

/** Melepas widget dari susunan (data sumber tidak tersentuh). Widget wajib tidak bisa dilepas. */
export function lepasWidget(daftar: WidgetInstans[], id: string): WidgetInstans[] {
  return daftar.filter((w) => w.id !== id || DEFINISI_WIDGET[w.jenis].wajib);
}
