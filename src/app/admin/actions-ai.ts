"use server";

import { z } from "zod";
import { getAkses } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { GalatAI, tanyaAI } from "@/lib/ai";
import { slideSchema, type Slide } from "@/lib/kurikulum";

/* Asisten AI guru — semua hasil berupa DRAF untuk diperiksa guru. Tidak ada data siswa yang dikirim. */

export type HasilAI<T> = { ok: true; data: T; sisa: number } | { ok: false; pesan: string };

async function siapkan(fitur: "tp" | "modul_ajar" | "slide" | "soal") {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) throw new GalatAI("Sesi berakhir. Silakan masuk ulang.");
  const { data, error } = await supabase.rpc("ambil_kuota_ai", { p_fitur: fitur });
  if (error) throw new GalatAI(error.code === "22023" || error.code === "42501" ? error.message : "Gagal memeriksa kuota.");
  return { supabase, sisa: Number(data ?? 0) };
}

async function namaMapel(supabase: Awaited<ReturnType<typeof siapkan>>["supabase"], id: string) {
  const { data } = await supabase.from("mapel").select("nama").eq("id", id).maybeSingle();
  if (!data) throw new GalatAI("Mapel tidak ditemukan.");
  return data.nama as string;
}
const gagal = (e: unknown): { ok: false; pesan: string } => {
  if (!(e instanceof GalatAI)) console.error("[ai]", e);
  return { ok: false, pesan: e instanceof GalatAI ? e.message : "Asisten AI gagal. Coba lagi." };
};
const bersih = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export type DrafTp = { kode: string; elemen: string; deskripsi: string; kktp: string; alokasi_jp: number; semester: number };

/** Draf TP + KKTP + alokasi JP dari capaian pembelajaran */
export async function aiSusunTp(input: { mapel_id: string; tingkat: string; cp: string; jumlah: number; jp_minggu: number }): Promise<HasilAI<DrafTp[]>> {
  try {
    const d = z
      .object({ mapel_id: uuid, tingkat: z.enum(["X", "XI", "XII"]), cp: z.string().trim().min(20, "Isi capaian pembelajaran dulu (CP)").max(6000), jumlah: z.number().int().min(3).max(20), jp_minggu: z.number().int().min(1).max(12) })
      .parse(input);
    const { supabase, sisa } = await siapkan("tp");
    const mapel = await namaMapel(supabase, d.mapel_id);
    const hasil = await tanyaAI<{ tp: DrafTp[] }>(
      `Susun ${d.jumlah} tujuan pembelajaran (TP) berurutan sebagai Alur Tujuan Pembelajaran untuk mapel ${mapel}, kelas ${d.tingkat} (fase ${d.tingkat === "X" ? "E" : "F"}), ` +
        `dibagi ke semester 1 dan 2, dengan total alokasi kira-kira ${d.jp_minggu * 34} JP setahun (${d.jp_minggu} JP/minggu).\n\n` +
        `Capaian pembelajaran (CP):\n${d.cp}\n\n` +
        `Setiap TP memuat kompetensi (kata kerja operasional) dan lingkup materi. KKTP berupa 2–4 indikator/kriteria ketercapaian yang dapat diamati, dipisah titik koma.\n` +
        `Format JSON: {"tp":[{"kode":"TP 1","elemen":"<elemen CP>","deskripsi":"...","kktp":"...","alokasi_jp":8,"semester":1}]}`,
      4000,
    );
    const data = (hasil.tp ?? []).slice(0, 20).map((t, i) => ({
      kode: bersih(t.kode || `TP ${i + 1}`, 20),
      elemen: bersih(t.elemen, 120),
      deskripsi: bersih(t.deskripsi, 500),
      kktp: bersih(t.kktp, 1000),
      alokasi_jp: Math.max(0, Math.min(99, Math.round(Number(t.alokasi_jp) || 0))),
      semester: Number(t.semester) === 2 ? 2 : 1,
    })).filter((t) => t.deskripsi.length >= 10);
    if (!data.length) throw new GalatAI("AI tidak menghasilkan TP. Coba perjelas CP.");
    return { ok: true, data, sisa };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, pesan: e.issues[0].message };
    return gagal(e);
  }
}

/** Draf slide materi untuk papan interaktif (opsional + soal cek pemahaman) */
export async function aiBuatSlide(input: { materi_id: string; topik: string; jumlah: number; soal: number }): Promise<HasilAI<Slide[]>> {
  try {
    const d = z
      .object({ materi_id: uuid, topik: z.string().trim().min(5, "Tulis topik/tujuan pembelajaran (min. 5 huruf)").max(1000), jumlah: z.number().int().min(3).max(15), soal: z.number().int().min(0).max(10) })
      .parse(input);
    const { supabase, sisa } = await siapkan(d.soal && !d.jumlah ? "soal" : "slide");
    const { data: m } = await supabase.from("materi_kelas").select("mapel_id, judul").eq("id", d.materi_id).maybeSingle();
    if (!m) throw new GalatAI("Materi tidak ditemukan.");
    const mapel = await namaMapel(supabase, m.mapel_id);
    const hasil = await tanyaAI<{ slide: unknown[] }>(
      `Buat ${d.jumlah} slide materi untuk ditayangkan di papan interaktif kelas, mapel ${mapel}, judul "${m.judul}".\n` +
        `Topik / tujuan pembelajaran: ${d.topik}\n` +
        `Slide jenis "isi": judul singkat + isi 3–6 poin pendek (awali tiap poin dengan "- "), boleh contoh lokal Indonesia/Jawa Barat. ` +
        `Slide pertama memuat tujuan pembelajaran, slide terakhir rangkuman & refleksi.` +
        (d.soal ? ` Tambahkan ${d.soal} slide jenis "soal" pilihan ganda (4 pilihan, kunci = indeks 0–3, pembahasan singkat) di akhir.` : "") +
        `\nFormat JSON: {"slide":[{"jenis":"isi","judul":"...","isi":"- ...\\n- ..."},{"jenis":"soal","judul":"Cek pemahaman","pertanyaan":"...","pilihan":["A","B","C","D"],"kunci":1,"pembahasan":"..."}]}`,
      5000,
    );
    const data = (hasil.slide ?? []).map((s) => slideSchema.safeParse(s)).filter((r) => r.success).map((r) => r.data!).filter((s) => s.jenis === "isi" || s.jenis === "soal").slice(0, 25);
    if (!data.length) throw new GalatAI("AI tidak menghasilkan slide yang valid. Coba lagi.");
    return { ok: true, data, sisa };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, pesan: e.issues[0].message };
    return gagal(e);
  }
}

export type DrafModul = { judul: string; bagian: { judul: string; isi: string }[] };

/** Kerangka modul ajar dari satu/lebih TP — ditampilkan untuk disalin/diunduh guru */
export async function aiModulAjar(input: { tp_ids: string[]; model: string; jp: number }): Promise<HasilAI<DrafModul>> {
  try {
    const d = z
      .object({ tp_ids: z.array(uuid).min(1, "Pilih minimal satu TP").max(5), model: z.string().trim().max(80), jp: z.number().int().min(1).max(20) })
      .parse(input);
    const { supabase, sisa } = await siapkan("modul_ajar");
    const { data: tps } = await supabase.from("tujuan_pembelajaran").select("kode, deskripsi, kktp, tingkat, fase, mapel_id").in("id", d.tp_ids);
    if (!tps?.length) throw new GalatAI("TP tidak ditemukan.");
    const mapel = await namaMapel(supabase, tps[0].mapel_id);
    const hasil = await tanyaAI<DrafModul>(
      `Susun kerangka MODUL AJAR Kurikulum Merdeka untuk mapel ${mapel}, kelas ${tps[0].tingkat} (fase ${tps[0].fase}), ${d.jp} JP, ` +
        `model pembelajaran: ${d.model || "pilihkan yang paling sesuai (mis. Problem Based Learning)"}.\n` +
        `Tujuan pembelajaran:\n${tps.map((t) => `- ${t.kode} ${t.deskripsi} (KKTP: ${t.kktp || "-"})`).join("\n")}\n\n` +
        `Bagian: Informasi umum (kompetensi awal, profil lulusan/dimensi, sarana termasuk papan interaktif), Tujuan pembelajaran, Pemahaman bermakna, ` +
        `Pertanyaan pemantik, Kegiatan pembelajaran (pendahuluan–inti–penutup dengan menit), Asesmen (diagnostik, formatif, sumatif + rubrik singkat), ` +
        `Pengayaan & remedial, Refleksi guru & peserta didik, Lampiran (LKPD singkat). Gunakan "- " untuk poin.\n` +
        `Format JSON: {"judul":"...","bagian":[{"judul":"...","isi":"..."}]}`,
      6000,
    );
    const data: DrafModul = {
      judul: bersih(hasil.judul || "Modul Ajar", 200),
      bagian: (hasil.bagian ?? []).slice(0, 20).map((b) => ({ judul: bersih(b.judul, 150), isi: String(b.isi ?? "").slice(0, 6000) })),
    };
    if (!data.bagian.length) throw new GalatAI("AI tidak menghasilkan modul ajar. Coba lagi.");
    return { ok: true, data, sisa };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, pesan: e.issues[0].message };
    return gagal(e);
  }
}
