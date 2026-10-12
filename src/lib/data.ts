import "server-only";
import { cache } from "react";
import * as statis from "@/content/sekolah";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

/**
 * Satu pintu untuk semua konten situs publik.
 * - Jika Supabase sudah tersambung: data diambil dari database (diubah lewat /admin).
 * - Jika belum: memakai isi file src/content/sekolah.ts.
 */

export type Profil = {
  slogan: string;
  pernyataan: string;
  alamat: string;
  telepon: string;
  email: string;
  jamLayanan: string;
  npsn: string;
  akreditasi: string;
  kepalaSekolah: string;
  fotoKepalaSekolah: string;
  sambutanKutipan: string;
  sambutanParagraf: string[];
  visi: string;
  misi: string[];
  sejarah: string[];
  statistik: { label: string; nilai: string }[];
};

export type BeritaItem = {
  id: string;
  slug: string;
  judul: string;
  tanggal: string;
  kategori: string;
  ringkasan: string;
  isi: string[];
  gambar?: string;
};
export type AgendaItem = { id: string; judul: string; tanggal: string; waktu?: string; tempat?: string };
export type PengumumanItem = { id: string; judul: string; tanggal: string; isi: string; penting: boolean };
export type FotoItem = { id: string; judul: string; gambar: string };

/** Teks "[ISI ...]" dianggap kosong supaya tidak tampil di situs */
const bersih = (s?: string | null) => {
  const t = (s ?? "").trim();
  return t.startsWith("[ISI") ? "" : t;
};
const paragraf = (s?: string | null) =>
  bersih(s)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
const baris = (s?: string | null) =>
  bersih(s)
    .split("\n")
    .map((p) => p.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
const daftarBersih = (l: string[]) => l.map(bersih).filter(Boolean);

function logGagal(bagian: string, error: unknown) {
  console.error(`[data] gagal memuat ${bagian}:`, error);
}

export const getProfil = cache(async (): Promise<Profil> => {
  const s = statis.sekolah;
  const fallback: Profil = {
    slogan: bersih(s.slogan),
    pernyataan: bersih(statis.pernyataan),
    alamat: bersih(s.alamat),
    telepon: bersih(s.telepon),
    email: bersih(s.email),
    jamLayanan: bersih(s.jamLayanan),
    npsn: bersih(s.npsn),
    akreditasi: bersih(s.akreditasi),
    kepalaSekolah: bersih(s.kepalaSekolah),
    fotoKepalaSekolah: s.fotoKepalaSekolah,
    sambutanKutipan: bersih(statis.sambutan.kutipan),
    sambutanParagraf: daftarBersih(statis.sambutan.paragraf),
    visi: bersih(statis.visi),
    misi: daftarBersih(statis.misi),
    sejarah: daftarBersih(statis.sejarah),
    statistik: statis.statistik.map((x) => ({ label: x.label, nilai: bersih(x.nilai) })),
  };
  if (!supabaseAktif) return fallback;

  const { data, error } = await supabasePublik().from("profil_sekolah").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) logGagal("profil", error);
    return fallback;
  }
  return {
    slogan: bersih(data.slogan),
    pernyataan: bersih(data.pernyataan),
    alamat: bersih(data.alamat),
    telepon: bersih(data.telepon),
    email: bersih(data.email),
    jamLayanan: bersih(data.jam_layanan),
    npsn: bersih(data.npsn),
    akreditasi: bersih(data.akreditasi),
    kepalaSekolah: bersih(data.kepala_sekolah),
    fotoKepalaSekolah: bersih(data.foto_kepala_sekolah) || s.fotoKepalaSekolah,
    sambutanKutipan: bersih(data.sambutan_kutipan),
    sambutanParagraf: paragraf(data.sambutan_isi),
    visi: bersih(data.visi),
    misi: baris(data.misi),
    sejarah: paragraf(data.sejarah),
    statistik: [
      { label: "Tahun berdiri", nilai: String(s.tahunBerdiri) },
      { label: "Peserta didik", nilai: bersih(data.jumlah_siswa) },
      { label: "Guru & tendik", nilai: bersih(data.jumlah_guru) },
      { label: "Ekstrakurikuler", nilai: bersih(data.jumlah_ekskul) },
    ],
  };
});

type BarisBerita = {
  id: string;
  slug: string;
  judul: string;
  tanggal: string;
  kategori: string;
  ringkasan: string;
  isi: string;
  gambar_url: string;
};
const keBerita = (b: BarisBerita): BeritaItem => ({
  id: b.id,
  slug: b.slug,
  judul: b.judul,
  tanggal: b.tanggal,
  kategori: b.kategori,
  ringkasan: b.ringkasan,
  isi: paragraf(b.isi),
  gambar: b.gambar_url || undefined,
});
const KOLOM_BERITA = "id, slug, judul, tanggal, kategori, ringkasan, isi, gambar_url";

export const getBerita = cache(async (limit?: number): Promise<BeritaItem[]> => {
  if (!supabaseAktif) {
    const list = [...statis.berita].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return list.slice(0, limit ?? list.length).map((b) => ({ ...b, id: b.slug }));
  }
  let q = supabasePublik()
    .from("berita")
    .select(KOLOM_BERITA)
    .eq("status", "terbit")
    .is("deleted_at", null)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    logGagal("berita", error);
    return [];
  }
  return (data as BarisBerita[]).map(keBerita);
});

export const getBeritaBySlug = cache(async (slug: string): Promise<BeritaItem | null> => {
  if (!supabaseAktif) {
    const b = statis.berita.find((x) => x.slug === slug);
    return b ? { ...b, id: b.slug } : null;
  }
  const { data, error } = await supabasePublik()
    .from("berita")
    .select(KOLOM_BERITA)
    .eq("slug", slug)
    .eq("status", "terbit")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) logGagal("detail berita", error);
  return data ? keBerita(data as BarisBerita) : null;
});

export const getAgenda = cache(async (limit?: number): Promise<AgendaItem[]> => {
  if (!supabaseAktif) {
    const list = [...statis.agenda].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    return list.slice(0, limit ?? list.length).map((a, i) => ({ ...a, id: String(i) }));
  }
  // tampilkan agenda mulai 7 hari lalu ke depan (+ kegiatan "Umum" dari kalender sekolah)
  const batas = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const db = supabasePublik();
  const [agenda, kalender] = await Promise.all([
    db.from("agenda").select("id, judul, tanggal, waktu, tempat").is("deleted_at", null).gte("tanggal", batas).order("tanggal", { ascending: true }).limit(limit ?? 200),
    db.from("kegiatan_kalender").select("id, judul, mulai, selesai, jam_mulai, jam_selesai, lokasi").is("deleted_at", null).eq("sasaran", "umum").gte("selesai", batas).order("mulai", { ascending: true }).limit(limit ?? 200),
  ]);
  if (agenda.error) logGagal("agenda", agenda.error);
  if (kalender.error) logGagal("kalender", kalender.error);
  const tgl = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" });
  const list: AgendaItem[] = [
    ...(agenda.data ?? []).map((a) => ({ ...a, waktu: a.waktu || undefined, tempat: a.tempat || undefined })),
    ...(kalender.data ?? []).map((k) => ({
      id: `k-${k.id}`,
      judul: k.judul,
      tanggal: k.mulai,
      waktu: [k.selesai > k.mulai ? `s.d. ${tgl(k.selesai)}` : "", k.jam_mulai ? `${String(k.jam_mulai).slice(0, 5)}${k.jam_selesai ? `–${String(k.jam_selesai).slice(0, 5)}` : ""}` : ""].filter(Boolean).join(", ") || undefined,
      tempat: k.lokasi || undefined,
    })),
  ].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return limit ? list.slice(0, limit) : list;
});

export const getPengumuman = cache(async (limit?: number): Promise<PengumumanItem[]> => {
  if (!supabaseAktif) {
    return statis.pengumuman.slice(0, limit).map((p, i) => ({ ...p, id: String(i), penting: Boolean(p.penting) }));
  }
  let q = supabasePublik()
    .from("pengumuman")
    .select("id, judul, isi, tanggal, penting")
    .is("deleted_at", null)
    .eq("aktif", true)
    .order("penting", { ascending: false })
    .order("tanggal", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    logGagal("pengumuman", error);
    return [];
  }
  return data;
});

export const getGaleri = cache(async (): Promise<FotoItem[]> => {
  if (!supabaseAktif) {
    return statis.galeri.filter((g) => g.gambar).map((g, i) => ({ id: String(i), judul: g.judul, gambar: g.gambar! }));
  }
  const { data, error } = await supabasePublik()
    .from("galeri")
    .select("id, judul, gambar_url, urutan")
    .is("deleted_at", null)
    .order("urutan", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    logGagal("galeri", error);
    return [];
  }
  return data.map((g) => ({ id: g.id, judul: g.judul, gambar: g.gambar_url }));
});

/* ------------------------------------------------------------------ */
/* Pengaturan situs: hero, layanan, footer, SEO                        */
/* ------------------------------------------------------------------ */

export type SlideHero = { id: string; gambar: string; gambarHp?: string; video?: string; alt: string; fokus: string; skala: number; tautan?: string };
export type TautanLayanan = { nama: string; keterangan: string; url: string };
export type SosialMedia = { nama: string; akun: string; url: string };
export type Situs = {
  hero: {
    label: string;
    judulAwal: string;
    judulMiring: string;
    judulAkhir: string;
    teks: string;
    tombolUtama: { label: string; href: string };
    tombolKedua: { label: string; href: string };
    detik: number;
    slide: SlideHero[];
  };
  layanan: TautanLayanan[];
  sosialMedia: SosialMedia[];
  footerTeks: string;
  seo: { judul: string; deskripsi: string; gambar: string };
};

const situsStatis = (): Situs => ({
  hero: {
    label: statis.hero.label,
    judulAwal: statis.hero.judulAwal,
    judulMiring: statis.hero.judulMiring,
    judulAkhir: statis.hero.judulAkhir,
    teks: statis.hero.teks,
    tombolUtama: statis.hero.tombolUtama,
    tombolKedua: statis.hero.tombolKedua,
    detik: 7,
    slide: statis.hero.foto.map((f, i) => ({ id: `${f.src}#${i}`, gambar: f.src, alt: f.alt, fokus: f.posisi, skala: 100, tautan: f.tautan })),
  },
  layanan: statis.layanan,
  sosialMedia: statis.sekolah.sosialMedia.filter((s) => s.url),
  footerTeks: "",
  seo: { judul: "", deskripsi: statis.sekolah.deskripsi, gambar: "" },
});

const daftarJson = <T,>(v: unknown, kunci: (keyof T)[]): T[] =>
  Array.isArray(v)
    ? (v.filter((x) => x && typeof x === "object" && kunci.every((k) => typeof (x as Record<string, unknown>)[k as string] === "string")) as T[])
    : [];

export const getSitus = cache(async (): Promise<Situs> => {
  const dasar = situsStatis();
  if (!supabaseAktif) return dasar;
  const db = supabasePublik();
  const [{ data: s, error }, { data: slide }] = await Promise.all([
    db.from("pengaturan_situs").select("*").eq("id", 1).maybeSingle(),
    // "*" agar tetap jalan sebelum migrasi video (Fase 14) dijalankan
    db.from("hero_slide").select("*").order("urutan").order("created_at"),
  ]);
  if (error) logGagal("pengaturan situs", error);
  if (!s) return dasar;
  const slides: SlideHero[] = (slide ?? []).map((x) => ({
    id: x.id,
    gambar: x.gambar_url,
    gambarHp: x.gambar_hp_url || undefined,
    video: (x as { video_url?: string }).video_url || undefined,
    alt: x.alt,
    fokus: `${x.fokus_x}% ${x.fokus_y}%`,
    skala: x.skala,
    tautan: x.tautan || undefined,
  }));
  return {
    hero: {
      label: s.hero_label,
      judulAwal: s.hero_judul_awal,
      judulMiring: s.hero_judul_miring,
      judulAkhir: s.hero_judul_akhir,
      teks: s.hero_teks,
      tombolUtama: { label: s.tombol1_label, href: s.tombol1_url || "/profil" },
      tombolKedua: { label: s.tombol2_label, href: s.tombol2_url || "/spmb" },
      detik: s.hero_detik,
      slide: slides.length ? slides : dasar.hero.slide, // belum ada foto di CMS → pakai foto bawaan
    },
    layanan: daftarJson<TautanLayanan>(s.layanan, ["nama", "keterangan", "url"]),
    sosialMedia: daftarJson<SosialMedia>(s.sosial_media, ["nama", "akun", "url"]).filter((x) => x.url),
    footerTeks: s.footer_teks,
    seo: { judul: s.seo_judul, deskripsi: s.seo_deskripsi || dasar.seo.deskripsi, gambar: s.seo_gambar_url },
  };
});

/* ------------------------------------------------------------------ */
/* Visual panel halaman masuk/portal (dikelola di Tampilan Website)    */
/* ------------------------------------------------------------------ */

export type VisualAkunItem = {
  id: string;
  jenis: "gambar" | "video";
  berkas: string;
  poster?: string;
  keterangan: string;
  judulTautan?: string;
  tautan?: string;
};

export const getVisualAkun = cache(async (lokasi: "akun" | "beranda" = "akun"): Promise<VisualAkunItem[]> => {
  if (!supabaseAktif) return [];
  const kolom = "id, jenis, berkas_url, poster_url, keterangan, judul_tautan, tautan";
  const db = supabasePublik();
  let { data, error } = await db.from("visual_akun").select(kolom).eq("lokasi", lokasi).order("urutan").order("created_at");
  if (error && lokasi === "akun") {
    // kolom lokasi belum ada (migrasi 20261122000000_visual_beranda.sql belum dijalankan) → semua visual milik halaman masuk
    ({ data, error } = await db.from("visual_akun").select(kolom).order("urutan").order("created_at"));
  }
  if (error) {
    // tabel belum ada (migrasi 20261120000000_visual_akun.sql belum dijalankan) → pakai visual bawaan
    logGagal(`visual ${lokasi}`, error);
    return [];
  }
  return (data ?? []).map((v) => ({
    id: v.id,
    jenis: v.jenis === "video" ? "video" : "gambar",
    berkas: v.berkas_url,
    poster: v.poster_url || undefined,
    keterangan: v.keterangan,
    judulTautan: v.judul_tautan || undefined,
    tautan: v.tautan || undefined,
  }));
});

export type EkskulRingkas = { nama: string; slug: string; bidang: string };

/** Daftar ekskul & organisasi yang tampil publik (untuk pita bergerak di beranda). */
export const getEkskulRingkas = cache(async (): Promise<EkskulRingkas[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik().rpc("organisasi_publik");
  if (error) {
    logGagal("ekskul", error);
    return [];
  }
  return ((data ?? []) as { nama: string; slug: string; bidang: string | null }[]).map((o) => ({ nama: o.nama, slug: o.slug, bidang: o.bidang ?? "" }));
});
