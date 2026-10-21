import "server-only";
import { unstable_cache } from "next/cache";
import type { ItemKabar, KartuSorotan, KategoriKabar, KunciGrup, MenuCms } from "@/content/menu-langit";
import { getAgenda, getBerita, getPengumuman, getPrestasi } from "@/lib/data";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

const MENIT_5 = 300;
const tabelBelumAda = (e: { code?: string }) => e.code === "42P01" || e.code === "PGRST205";

/**
 * Isi CMS navigasi (migrasi 20261223). Di-cache 5 menit agar header tidak melambat; tabel belum ada / galat → kosong
 * (menu memakai teks bawaan). Disegarkan langsung saat admin menyimpan (revalidateTag "menu-navigasi").
 */
export const getMenuCms = unstable_cache(
  async (): Promise<MenuCms> => {
    const kosong: MenuCms = { grup: {}, keterangan: {}, sorotan: {} };
    if (!supabaseAktif) return kosong;
    const db = supabasePublik();
    const [g, k, s] = await Promise.all([
      db.from("menu_grup").select("kunci, pengantar, ajakan"),
      db.from("menu_keterangan").select("grup, href, keterangan"),
      db.from("menu_sorotan").select("*").eq("aktif", true).order("urutan").order("created_at"),
    ]);
    for (const r of [g, k, s]) if (r.error && !tabelBelumAda(r.error)) console.error("[menu] gagal memuat CMS navigasi:", r.error.code, r.error.message);
    const cms = kosong;
    for (const r of g.data ?? []) cms.grup[r.kunci as KunciGrup] = { pengantar: r.pengantar ?? "", ajakan: r.ajakan ?? "" };
    for (const r of k.data ?? []) {
      const kunci = r.grup as KunciGrup;
      (cms.keterangan[kunci] ??= {})[r.href] = r.keterangan ?? "";
    }
    for (const r of s.data ?? []) {
      const kunci = r.grup as KunciGrup;
      const kartu: KartuSorotan = {
        judul: r.judul,
        keterangan: r.keterangan ?? "",
        href: r.tautan,
        foto: { src: r.foto_url || "/images/gedung.jpg", alt: r.judul },
        fokus: { x: r.fokus_x ?? 50, y: r.fokus_y ?? 50 },
        sementara: r.is_placeholder === true && Boolean(r.foto_url),
      };
      (cms.sorotan[kunci] ??= []).push(kartu);
    }
    return cms;
  },
  ["menu-navigasi-cms"],
  { revalidate: MENIT_5, tags: ["menu-navigasi"] },
);

/**
 * 3 kabar terbaru per kategori untuk mega menu & menu HP (berita, pengumuman, prestasi, agenda mendatang).
 * Di-cache 5 menit; hanya data terbit/aktif (klien publik + RLS).
 */
export const getKabarMenu = unstable_cache(
  async (): Promise<Record<KategoriKabar, ItemKabar[]>> => {
    const [berita, pengumuman, prestasi, agenda] = await Promise.all([getBerita(12), getPengumuman(6), getPrestasi(6), getAgenda(6)]);
    const beritaItem: ItemKabar[] = berita.map((b) => ({
      id: `b-${b.id}`,
      jenis: b.kategori === "Prestasi" ? "Prestasi" : "Berita",
      judul: b.judul,
      tanggal: b.tanggal,
      href: `/berita/${b.slug}`,
      foto: b.gambar || undefined,
      sementara: b.gambarSementara,
    }));
    const pengumumanItem: ItemKabar[] = pengumuman.map((p) => ({ id: `p-${p.id}`, jenis: "Pengumuman", judul: p.judul, tanggal: p.tanggal, href: `/pengumuman#pengumuman-${p.id}`, foto: p.poster?.url }));
    const prestasiItem: ItemKabar[] = prestasi.map((p) => ({
      id: `r-${p.id}`,
      jenis: "Prestasi",
      judul: `${p.peringkat} ${p.namaLomba}`.trim(),
      tanggal: p.tanggal,
      href: "/prestasi",
      foto: p.foto,
      sementara: p.fotoSementara,
    }));
    const agendaItem: ItemKabar[] = agenda.map((a) => ({ id: `a-${a.id}`, jenis: "Agenda", judul: a.judul, tanggal: a.tanggal, href: "/agenda" }));
    const terbaru = (l: ItemKabar[]) => [...l].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 3);
    return {
      Semua: terbaru([...beritaItem, ...pengumumanItem, ...prestasiItem]),
      Berita: terbaru(beritaItem.filter((b) => b.jenis === "Berita")),
      Pengumuman: terbaru(pengumumanItem),
      Prestasi: terbaru([...beritaItem.filter((b) => b.jenis === "Prestasi"), ...prestasiItem]),
      // agenda: yang paling dekat (bukan yang terbaru dibuat)
      Agenda: [...agendaItem].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).slice(0, 3),
    };
  },
  ["menu-navigasi-kabar"],
  { revalidate: MENIT_5, tags: ["menu-navigasi"] },
);
