/**
 * Tema & tampilan yang bisa diubah admin tanpa menyentuh kode
 * (Admin → Tema & Tampilan; disimpan di pengaturan_situs.tema).
 * Berkas ini dipakai server & klien — jangan impor modul server di sini.
 */

/** Ikon yang bisa dipilih admin (nama komponen lucide-react). */
export const DAFTAR_IKON = [
  "LayoutDashboard",
  "CalendarCheck",
  "ClipboardList",
  "ShieldCheck",
  "GraduationCap",
  "Users",
  "BookOpen",
  "Trophy",
  "Award",
  "Sparkles",
  "Megaphone",
  "Images",
  "HeartHandshake",
  "Flower2",
  "Star",
  "Lightbulb",
  "Music",
  "Globe",
  "School",
  "Newspaper",
  "MapPin",
  "Phone",
  "Compass",
  "Rocket",
  "MessageCircle",
  "Library",
  "Palette",
  "Medal",
] as const;
export type NamaIkon = (typeof DAFTAR_IKON)[number];

export const LABEL_IKON: Record<NamaIkon, string> = {
  LayoutDashboard: "Dasbor",
  CalendarCheck: "Kalender centang",
  ClipboardList: "Papan tugas",
  ShieldCheck: "Perisai",
  GraduationCap: "Topi wisuda",
  Users: "Orang-orang",
  BookOpen: "Buku terbuka",
  Trophy: "Piala",
  Award: "Penghargaan",
  Sparkles: "Kilau",
  Megaphone: "Pengeras suara",
  Images: "Galeri foto",
  HeartHandshake: "Jabat tangan",
  Flower2: "Bunga",
  Star: "Bintang",
  Lightbulb: "Lampu ide",
  Music: "Musik",
  Globe: "Bola dunia",
  School: "Gedung sekolah",
  Newspaper: "Koran",
  MapPin: "Lokasi",
  Phone: "Telepon",
  Compass: "Kompas",
  Rocket: "Roket",
  MessageCircle: "Pesan",
  Library: "Perpustakaan",
  Palette: "Palet",
  Medal: "Medali",
};

/** Isi otomatis kartu bento (diambil dari data situs) */
export const ISI_OTOMATIS = {
  "": "Tidak ada (teks saja)",
  tahun: "Angka tahun berkarya",
  portal: "Daftar layanan portal",
  berita: "Judul berita terbaru",
  galeri: "Jumlah foto galeri",
  ekskul: "Jumlah ekskul & OSIS",
  kepsek: "Nama kepala sekolah",
} as const;
export type IsiOtomatis = keyof typeof ISI_OTOMATIS;

export type KartuBento = {
  label: string;
  judul: string;
  teks: string;
  tautan: string;
  ikon: NamaIkon | "";
  gambar: string;
  ukuran: "biasa" | "lebar" | "besar";
  isi: IsiOtomatis;
};

export type Tema = {
  warna: { utama: string; aksen: string; gelap: string };
  beranda: {
    efekGulir: boolean;
    teksRaksasa: string;
    babak2: { label: string; judul: string; miring: string };
    babak3: { label: string; judul: string; miring: string };
    pitaJudul: string;
    bentoJudul: string;
    bentoMiring: string;
    bentoTeks: string;
    bento: KartuBento[];
  };
  masuk: { judul: string; miring: string; deskripsi: string; fitur: { ikon: NamaIkon; teks: string }[] };
};

export const TEMA_BAWAAN: Tema = {
  warna: { utama: "#284fd7", aksen: "#7c5cff", gelap: "#0b0a1a" },
  beranda: {
    efekGulir: true,
    teksRaksasa: "SMAN 22",
    babak2: { label: "Nilai kami", judul: "Belajar dengan tujuan.", miring: "Tumbuh bersama." },
    babak3: { label: "Satu keluarga, satu pintu", judul: "Siap tumbuh", miring: "bersama kami?" },
    pitaJudul: "Ruang tumbuh warga SMAN 22",
    bentoJudul: "Satu sekolah,",
    bentoMiring: "banyak cerita.",
    bentoTeks: "Jelajahi program, layanan, dan kabar terbaru SMA Negeri 22 Bandung — semuanya terhubung dalam satu pintu.",
    bento: [
      { label: "Program unggulan", judul: "7 Kebiasaan Anak Indonesia Hebat", teks: "Pembiasaan karakter harian melalui jurnal, bukti kegiatan, dan refleksi.", tautan: "/program", ikon: "Sparkles", gambar: "", ukuran: "besar", isi: "" },
      { label: "Sejak 1989", judul: "", teks: "tahun berkarya untuk pendidikan Kota Bandung", tautan: "/profil", ikon: "", gambar: "", ukuran: "biasa", isi: "tahun" },
      { label: "Portal 22", judul: "Sekolah dalam genggaman", teks: "", tautan: "/masuk", ikon: "", gambar: "", ukuran: "biasa", isi: "portal" },
      { label: "Galeri", judul: "Momen kegiatan", teks: "", tautan: "/galeri", ikon: "Images", gambar: "", ukuran: "biasa", isi: "galeri" },
      { label: "Penerimaan murid baru", judul: "Mari bergabung bersama keluarga besar SMAN 22.", teks: "", tautan: "/spmb", ikon: "GraduationCap", gambar: "", ukuran: "biasa", isi: "" },
      { label: "Kabar terbaru", judul: "Berita & prestasi sekolah", teks: "", tautan: "/berita", ikon: "Newspaper", gambar: "", ukuran: "lebar", isi: "berita" },
      { label: "Ekskul & OSIS", judul: "Temukan wadah bakatmu", teks: "", tautan: "/ekskul", ikon: "Trophy", gambar: "", ukuran: "biasa", isi: "ekskul" },
      { label: "Sambutan", judul: "Pesan kepala sekolah", teks: "", tautan: "/sambutan", ikon: "MessageCircle", gambar: "", ukuran: "biasa", isi: "kepsek" },
    ],
  },
  masuk: {
    judul: "Satu pintu untuk keluarga",
    miring: "SMAN 22.",
    deskripsi: "Bagi seluruh warga SMAN 22 Bandung.",
    fitur: [
      { ikon: "LayoutDashboard", teks: "Dashboard sesuai peran" },
      { ikon: "CalendarCheck", teks: "Absensi & jadwal" },
      { ikon: "ClipboardList", teks: "Tugas, nilai & layanan" },
    ],
  },
};

/* ---------------- pembersih (data dari database selalu diperiksa ulang) ---------------- */

const HEX = /^#[0-9a-f]{6}$/i;
const teks = (v: unknown, maks: number, bawaan: string) => (typeof v === "string" ? v.trim().slice(0, maks) : bawaan);
const warna = (v: unknown, bawaan: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : bawaan);
const ikon = <T extends string>(v: unknown, bawaan: T): NamaIkon | T => ((DAFTAR_IKON as readonly string[]).includes(v as string) ? (v as NamaIkon) : bawaan);
/** tautan internal (/…) atau https:// saja */
export const tautanAman = (v: unknown) =>
  typeof v === "string" && (/^\/(?!\/)[\w\-./?=&#%]*$/.test(v.trim()) || /^https:\/\/[^\s<>"]+$/.test(v.trim())) ? v.trim().slice(0, 300) : "";
const gambarAman = (v: unknown) => (typeof v === "string" && (/^https:\/\/[^\s<>"]+$/.test(v) || /^\/images\/[\w\-./]+$/.test(v) || /^http:\/\/localhost[:/]/.test(v)) ? v : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function bacaTema(raw: unknown): Tema {
  const r = obj(raw);
  const b = TEMA_BAWAAN;
  const w = obj(r.warna);
  const be = obj(r.beranda);
  const m = obj(r.masuk);
  const babak = (v: unknown, d: Tema["beranda"]["babak2"]) => {
    const x = obj(v);
    return { label: teks(x.label, 60, d.label), judul: teks(x.judul, 80, d.judul), miring: teks(x.miring, 60, d.miring) };
  };
  const bentoRaw = Array.isArray(be.bento) ? be.bento.slice(0, 10) : null;
  const bento: KartuBento[] = bentoRaw
    ? bentoRaw.map((k) => {
        const x = obj(k);
        const ukuran = x.ukuran === "besar" || x.ukuran === "lebar" ? x.ukuran : "biasa";
        const isi = (Object.keys(ISI_OTOMATIS) as IsiOtomatis[]).includes(x.isi as IsiOtomatis) ? (x.isi as IsiOtomatis) : "";
        return {
          label: teks(x.label, 50, ""),
          judul: teks(x.judul, 90, ""),
          teks: teks(x.teks, 200, ""),
          tautan: tautanAman(x.tautan),
          ikon: ikon(x.ikon, ""),
          gambar: gambarAman(x.gambar),
          ukuran,
          isi,
        };
      })
    : b.beranda.bento;
  const fiturRaw = Array.isArray(m.fitur) ? m.fitur.slice(0, 4) : null;
  return {
    warna: { utama: warna(w.utama, b.warna.utama), aksen: warna(w.aksen, b.warna.aksen), gelap: warna(w.gelap, b.warna.gelap) },
    beranda: {
      efekGulir: typeof be.efekGulir === "boolean" ? be.efekGulir : b.beranda.efekGulir,
      teksRaksasa: teks(be.teksRaksasa, 14, b.beranda.teksRaksasa),
      babak2: babak(be.babak2, b.beranda.babak2),
      babak3: babak(be.babak3, b.beranda.babak3),
      pitaJudul: teks(be.pitaJudul, 80, b.beranda.pitaJudul),
      bentoJudul: teks(be.bentoJudul, 60, b.beranda.bentoJudul),
      bentoMiring: teks(be.bentoMiring, 60, b.beranda.bentoMiring),
      bentoTeks: teks(be.bentoTeks, 240, b.beranda.bentoTeks),
      bento,
    },
    masuk: {
      judul: teks(m.judul, 60, b.masuk.judul),
      miring: teks(m.miring, 40, b.masuk.miring),
      deskripsi: teks(m.deskripsi, 160, b.masuk.deskripsi),
      fitur: fiturRaw
        ? fiturRaw.map((f) => ({ ikon: ikon(obj(f).ikon, "Sparkles" as NamaIkon), teks: teks(obj(f).teks, 40, "") })).filter((f) => f.teks)
        : b.masuk.fitur,
    },
  };
}

/** Variabel CSS untuk warna tema (nilai sudah dipastikan berformat #rrggbb). */
export function cssTema(t: Tema) {
  return `:root{--tema-utama:${t.warna.utama};--tema-aksen:${t.warna.aksen};--tema-gelap:${t.warna.gelap}}`;
}
