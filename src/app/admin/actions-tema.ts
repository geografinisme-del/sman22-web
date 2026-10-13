"use server";

import { revalidatePath } from "next/cache";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import { bacaTema, tautanAman, TEMA_BAWAAN, type Tema } from "@/lib/tema";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const HEX = /^#[0-9a-f]{6}$/i;
const ambil = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/**
 * Simpan satu bagian tema (warna / beranda / bento / masuk). Bagian lain tidak berubah.
 * Semua isian dibersihkan lagi oleh bacaTema() sehingga nilai aneh tidak pernah tersimpan.
 */
export async function simpanTema(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return TANPA_AKSES;
  const bagian = ambil(form, "bagian");

  const { data: baris, error: errBaca } = await ctx.supabase.from("pengaturan_situs").select("*").eq("id", 1).maybeSingle();
  if (errBaca || !baris) return { ok: false, pesan: "Pengaturan situs belum tersedia." };
  if (!("tema" in baris)) return { ok: false, pesan: "Jalankan migrasi 20261124000000_tema_tampilan.sql di Supabase terlebih dahulu." };
  const t: Tema = bacaTema((baris as { tema?: unknown }).tema);
  const errors: Record<string, string> = {};

  if (bagian === "reset") {
    const yang = ambil(form, "yang") as keyof Tema;
    if (yang === "warna" || yang === "beranda" || yang === "masuk") (t as Record<string, unknown>)[yang] = TEMA_BAWAAN[yang];
  } else if (bagian === "warna") {
    for (const k of ["utama", "aksen", "gelap"] as const) {
      const v = ambil(form, k);
      if (!HEX.test(v)) errors[k] = "Format warna #rrggbb";
      else t.warna[k] = v.toLowerCase();
    }
  } else if (bagian === "beranda") {
    t.beranda.efekGulir = form.get("efekGulir") === "on";
    t.beranda.teksRaksasa = ambil(form, "teksRaksasa");
    t.beranda.babak2 = { label: ambil(form, "b2_label"), judul: ambil(form, "b2_judul"), miring: ambil(form, "b2_miring") };
    t.beranda.babak3 = { label: ambil(form, "b3_label"), judul: ambil(form, "b3_judul"), miring: ambil(form, "b3_miring") };
    t.beranda.pitaJudul = ambil(form, "pitaJudul");
    t.beranda.bentoJudul = ambil(form, "bentoJudul");
    t.beranda.bentoMiring = ambil(form, "bentoMiring");
    t.beranda.bentoTeks = ambil(form, "bentoTeks");
  } else if (bagian === "bento") {
    let daftar: { id: string; label: string; judul: string; teks: string; tautan: string; ikon: string; gambar: string; ukuran: string; isi: string; hapusGambar?: boolean }[];
    try {
      daftar = JSON.parse(ambil(form, "bento_json"));
      if (!Array.isArray(daftar) || daftar.length > 10) throw new Error();
    } catch {
      return { ok: false, pesan: "Data kartu tidak valid. Muat ulang halaman." };
    }
    const hasil = [];
    for (const [i, k] of daftar.entries()) {
      if (k.tautan && !tautanAman(k.tautan)) {
        errors[`tautan_${k.id}`] = "Diawali / atau https://";
        continue;
      }
      let gambar = k.hapusGambar ? "" : k.gambar;
      const f = form.get(`gambar_${k.id}`) as File | null;
      const salah = cekGambar(f);
      if (salah) {
        errors[`gambar_${k.id}`] = salah;
        continue;
      }
      if (f && f.size > 0) {
        try {
          gambar = await unggahGambar(ctx.supabase, f, "tema");
        } catch (e) {
          return { ok: false, pesan: `Kartu ${i + 1}: ${(e as Error).message}` };
        }
      }
      hasil.push({ ...k, gambar });
    }
    if (Object.keys(errors).length) return { ok: false, pesan: "Periksa isian kartu yang ditandai.", errors };
    t.beranda.bento = bacaTema({ beranda: { bento: hasil } }).beranda.bento;
  } else if (bagian === "masuk") {
    t.masuk.judul = ambil(form, "judul");
    t.masuk.miring = ambil(form, "miring");
    t.masuk.deskripsi = ambil(form, "deskripsi");
    t.masuk.fitur = [0, 1, 2, 3].map((i) => ({ ikon: ambil(form, `fitur_ikon_${i}`), teks: ambil(form, `fitur_teks_${i}`) })).filter((f) => f.teks) as Tema["masuk"]["fitur"];
  } else {
    return { ok: false, pesan: "Bagian tidak dikenal." };
  }
  if (Object.keys(errors).length) return { ok: false, pesan: "Periksa isian yang ditandai.", errors };

  const bersih = bacaTema(t);
  const { error } = await ctx.supabase.from("pengaturan_situs").update({ tema: bersih }).eq("id", 1);
  if (error) {
    console.error("[tema]", error.code, error.message);
    return { ok: false, pesan: error.code === "42703" || error.code === "PGRST204" ? "Jalankan migrasi 20261124000000_tema_tampilan.sql di Supabase." : "Gagal menyimpan. Coba lagi." };
  }
  revalidatePath("/", "layout");
  return { ok: true, pesan: bagian === "reset" ? "Dikembalikan ke bawaan." : "Tersimpan. Perubahan tampil di website dalam ±1 menit." };
}
