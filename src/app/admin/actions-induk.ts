"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { pesanError } from "@/lib/admin/schema";
import {
  imporPegawaiBaris,
  imporSiswaBaris,
  kelasSchema,
  kunciKelas,
  namaKelasBaku,
  ortuSchema,
  pegawaiSchema,
  siswaSchema,
  tahunAjaranSchema,
  type BarisImpor,
} from "@/lib/admin/induk";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak mengubah data induk." };

function ambil(form: FormData, kunci: string[]) {
  return Object.fromEntries(kunci.map((k) => [k, String(form.get(k) ?? "")]));
}
const kosongKeNull = (o: Record<string, string>, kunci: string[]) => {
  const r: Record<string, string | number | null> = { ...o };
  for (const k of kunci) if (r[k] === "") r[k] = null;
  return r;
};

function pesanDb(error: { code?: string; message: string; details?: string | null }) {
  console.error("[induk] kesalahan database:", error.code, error.message);
  if (error.code === "23505") {
    if (/nisn/.test(error.message + (error.details ?? ""))) return "NISN sudah dipakai siswa lain.";
    if (/nip/.test(error.message + (error.details ?? ""))) return "NIP sudah dipakai pegawai lain.";
    if (/nuptk/.test(error.message + (error.details ?? ""))) return "NUPTK sudah dipakai pegawai lain.";
    if (/tahun_ajaran_id, nama|kelas_tahun_ajaran_id_nama/.test(error.message + (error.details ?? ""))) return "Nama kelas sudah ada di tahun ajaran ini.";
    return "Data yang sama sudah ada.";
  }
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

/* -------------------------- Tahun ajaran -------------------------- */

export async function simpanTahunAjaran(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = tahunAjaranSchema.safeParse({ ...ambil(form, ["nama", "semester", "tanggal_mulai", "tanggal_selesai"]), id });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { id: _i, ...isi } = parsed.data;
  void _i;
  const baris = kosongKeNull(isi, ["tanggal_mulai", "tanggal_selesai"]);
  const { error } = id
    ? await ctx.supabase.from("tahun_ajaran").update(baris).eq("id", id)
    : await ctx.supabase.from("tahun_ajaran").insert(baris);
  if (error) return { ok: false, pesan: error.code === "23505" ? "Tahun ajaran ini sudah ada." : pesanDb(error) };
  revalidatePath("/admin", "layout");
  redirect("/admin/tahun-ajaran?pesan=tersimpan");
}

export async function aktifkanTahunAjaran(form: FormData) {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = z.string().uuid().safeParse(String(form.get("id")));
  if (!id.success) redirect("/admin/tahun-ajaran?pesan=gagal");
  const { error } = await ctx.supabase.rpc("aktifkan_tahun_ajaran", { ta_id: id.data });
  if (error) {
    console.error("[induk] aktifkan TA:", error.message);
    redirect("/admin/tahun-ajaran?pesan=gagal");
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/tahun-ajaran?pesan=tersimpan");
}

/* ------------------------------ Kelas ----------------------------- */

export async function simpanKelas(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = kelasSchema.safeParse({ ...ambil(form, ["tahun_ajaran_id", "tingkat", "nama", "program", "wali_kelas_id"]), id });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { id: _i, ...isi } = parsed.data;
  void _i;
  const baris = kosongKeNull(isi, ["wali_kelas_id"]);
  const { error } = id ? await ctx.supabase.from("kelas").update(baris).eq("id", id) : await ctx.supabase.from("kelas").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error), errors: error.code === "23505" ? { nama: "Nama kelas sudah dipakai" } : undefined };
  revalidatePath("/admin", "layout");
  redirect(`/admin/kelas?ta=${isi.tahun_ajaran_id}&pesan=tersimpan`);
}

export async function arsipkanKelas(form: FormData) {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = z.string().uuid().safeParse(String(form.get("id")));
  if (!id.success) redirect("/admin/kelas?pesan=gagal");
  const { count } = await ctx.supabase.from("anggota_kelas").select("id", { count: "exact", head: true }).eq("kelas_id", id.data);
  if ((count ?? 0) > 0) redirect("/admin/kelas?pesan=kelas-berisi");
  const { error } = await ctx.supabase.from("kelas").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  redirect(`/admin/kelas?pesan=${error ? "gagal" : "diarsipkan"}`);
}

/* ------------------------------ Siswa ----------------------------- */

const KOLOM_SISWA_FORM = [
  "nisn", "nis", "nama", "jenis_kelamin", "tempat_lahir", "tanggal_lahir", "agama", "alamat", "telepon", "email",
  "tahun_masuk", "status", "keterangan_status", "kelas_id",
];

export async function simpanSiswa(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = siswaSchema.safeParse({ ...ambil(form, KOLOM_SISWA_FORM), id });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { id: _i, kelas_id, ...isi } = parsed.data;
  void _i;
  const baris = kosongKeNull(isi, ["nisn", "nis", "jenis_kelamin", "tanggal_lahir", "tahun_masuk"]);
  if (baris.tahun_masuk != null) baris.tahun_masuk = Number(baris.tahun_masuk);

  let sid = id;
  if (id) {
    const { error, count } = await ctx.supabase.from("siswa").update(baris, { count: "exact" }).eq("id", id);
    if (error) return { ok: false, pesan: pesanDb(error), errors: error.code === "23505" ? { nisn: "NISN sudah dipakai" } : undefined };
    if (!count) return { ok: false, pesan: "Data siswa tidak ditemukan." };
  } else {
    const { data, error } = await ctx.supabase.from("siswa").insert(baris).select("id").single();
    if (error) return { ok: false, pesan: pesanDb(error), errors: error.code === "23505" ? { nisn: "NISN sudah dipakai" } : undefined };
    sid = data.id;
  }

  // kelas pada tahun ajaran aktif
  const { data: ta } = await ctx.supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  if (ta && sid) {
    if (kelas_id) {
      const { error } = await ctx.supabase
        .from("anggota_kelas")
        .upsert({ siswa_id: sid, kelas_id, tahun_ajaran_id: ta.id }, { onConflict: "siswa_id,tahun_ajaran_id" });
      if (error) return { ok: false, pesan: "Data siswa tersimpan, tetapi kelas gagal diatur: " + pesanDb(error) };
    } else {
      await ctx.supabase.from("anggota_kelas").delete().eq("siswa_id", sid).eq("tahun_ajaran_id", ta.id);
    }
  }
  revalidatePath("/admin", "layout");
  if (!id) redirect(`/admin/siswa/${sid}?pesan=tersimpan`);
  return { ok: true, pesan: "Data siswa berhasil disimpan." };
}

export async function tambahOrangTua(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = ortuSchema.safeParse(ambil(form, ["siswa_id", "nama", "hubungan", "telepon", "pekerjaan"]));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian.", errors: pesanError(parsed.error) };
  const { siswa_id, hubungan, ...isi } = parsed.data;
  const { data, error } = await ctx.supabase.from("orang_tua").insert(isi).select("id").single();
  if (error) return { ok: false, pesan: pesanDb(error) };
  const rel = await ctx.supabase.from("siswa_orang_tua").insert({ siswa_id, orang_tua_id: data.id, hubungan });
  if (rel.error) return { ok: false, pesan: pesanDb(rel.error) };
  revalidatePath(`/admin/siswa/${siswa_id}`);
  redirect(`/admin/siswa/${siswa_id}?pesan=tersimpan#orang-tua`);
}

export async function lepasOrangTua(form: FormData) {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const ids = z.object({ siswa_id: z.string().uuid(), orang_tua_id: z.string().uuid() }).safeParse({
    siswa_id: String(form.get("siswa_id")),
    orang_tua_id: String(form.get("orang_tua_id")),
  });
  if (!ids.success) redirect("/admin/siswa?pesan=gagal");
  await ctx.supabase.from("siswa_orang_tua").delete().match(ids.data);
  redirect(`/admin/siswa/${ids.data.siswa_id}?pesan=tersimpan#orang-tua`);
}

/* ----------------------------- Pegawai ---------------------------- */

export async function simpanPegawai(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = pegawaiSchema.safeParse({
    ...ambil(form, ["nama", "nip", "nuptk", "jenis_kelamin", "jenis", "jabatan", "telepon", "email", "status"]),
    id,
  });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { id: _i, ...isi } = parsed.data;
  void _i;
  const baris = kosongKeNull(isi, ["nip", "nuptk", "jenis_kelamin"]);
  if (id) {
    const { error } = await ctx.supabase.from("pegawai").update(baris).eq("id", id);
    if (error) return { ok: false, pesan: pesanDb(error) };
    revalidatePath("/admin", "layout");
    return { ok: true, pesan: "Data pegawai berhasil disimpan." };
  }
  const { data, error } = await ctx.supabase.from("pegawai").insert(baris).select("id").single();
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin", "layout");
  redirect(`/admin/pegawai/${data.id}?pesan=tersimpan`);
}

/* ------------------------------ Impor ----------------------------- */

export type StatusBaris = { baris: number; status: "baru" | "ada" | "galat"; pesan: string[]; data: BarisImpor };
export type HasilPratinjau = {
  ok: boolean;
  pesan?: string;
  baris: StatusBaris[];
  ringkas: { baru: number; ada: number; galat: number };
  kelasBaru: string[];
  adaTahunAktif: boolean;
};

const MAKS_BARIS = 3000;

async function ambilBertahap<T>(cari: (from: number, to: number) => PromiseLike<{ data: T[] | null }>) {
  const hasil: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data } = await cari(i, i + 999);
    if (!data?.length) break;
    hasil.push(...data);
    if (data.length < 1000) break;
  }
  return hasil;
}

export async function pratinjauImpor(jenis: "siswa" | "pegawai", rows: BarisImpor[], galatKlien: string[][]): Promise<HasilPratinjau> {
  const kosong = { baris: [], ringkas: { baru: 0, ada: 0, galat: 0 }, kelasBaru: [], adaTahunAktif: false };
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return { ok: false, pesan: TANPA_AKSES.pesan, ...kosong };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, pesan: "File tidak berisi data.", ...kosong };
  if (rows.length > MAKS_BARIS) return { ok: false, pesan: `Maksimal ${MAKS_BARIS} baris sekali impor. Bagi file menjadi beberapa bagian.`, ...kosong };

  const skema = jenis === "siswa" ? imporSiswaBaris : imporPegawaiBaris;
  const hasil: StatusBaris[] = rows.map((r, i) => {
    const p = skema.safeParse(r);
    const pesan = [...(galatKlien[i] ?? [])];
    if (!p.success) pesan.push(...Object.values(pesanError(p.error)));
    return { baris: i + 1, status: pesan.length ? "galat" : "baru", pesan, data: r };
  });

  // duplikat di dalam file & data yang sudah ada di database
  const kunci = jenis === "siswa" ? "nisn" : "nip";
  const lihat = new Map<string, number>();
  for (const h of hasil) {
    const k = h.data[kunci];
    if (!k) continue;
    if (lihat.has(k)) {
      h.status = "galat";
      h.pesan.push(`${kunci.toUpperCase()} ${k} muncul dua kali di file (baris ${lihat.get(k)})`);
    } else lihat.set(k, h.baris);
  }
  const nilai = [...lihat.keys()];
  const ada = new Set<string>();
  for (let i = 0; i < nilai.length; i += 300) {
    const { data } = await ctx.supabase.from(jenis === "siswa" ? "siswa" : "pegawai").select(kunci).in(kunci, nilai.slice(i, i + 300));
    for (const d of (data ?? []) as Record<string, string>[]) ada.add(d[kunci]);
  }
  for (const h of hasil) if (h.status === "baru" && h.data[kunci] && ada.has(h.data[kunci])) h.status = "ada";

  let kelasBaru: string[] = [];
  let adaTahunAktif = true;
  if (jenis === "siswa") {
    const { data: ta } = await ctx.supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
    adaTahunAktif = Boolean(ta);
    const kelasFile = [...new Set(hasil.map((h) => h.data.kelas).filter(Boolean))];
    if (kelasFile.length) {
      if (!ta) {
        for (const h of hasil) if (h.data.kelas) { h.status = "galat"; h.pesan.push("Belum ada tahun ajaran aktif untuk menempatkan kelas"); }
      } else {
        const kelasDb = await ambilBertahap<{ nama: string }>((a, b) =>
          ctx.supabase.from("kelas").select("nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).range(a, b),
        );
        const kunciDb = new Set(kelasDb.map((k) => kunciKelas(k.nama)));
        const baruUnik = new Map<string, string>();
        for (const k of kelasFile) if (!kunciDb.has(kunciKelas(k)) && !baruUnik.has(kunciKelas(k))) baruUnik.set(kunciKelas(k), k);
        kelasBaru = [...baruUnik.values()].map(namaKelasBaku);
        for (const h of hasil) {
          if (h.data.kelas && !kunciDb.has(kunciKelas(h.data.kelas)) && !/^(XII|XI|X|10|11|12)/i.test(h.data.kelas.trim())) {
            h.status = "galat";
            h.pesan.push(`Tingkat kelas "${h.data.kelas}" tidak dikenali (contoh: X-1, XI-2, XII-3)`);
          }
        }
      }
    }
  }

  const ringkas = { baru: 0, ada: 0, galat: 0 };
  for (const h of hasil) ringkas[h.status]++;
  return { ok: true, baris: hasil, ringkas, kelasBaru, adaTahunAktif };
}

export async function jalankanImpor(
  jenis: "siswa" | "pegawai",
  rows: BarisImpor[],
  opsi: { perbarui: boolean; buatKelas: boolean },
): Promise<{ ok: boolean; pesan: string; hasil?: Record<string, number> }> {
  const ctx = await aksesAksi("data_induk.kelola");
  if (!ctx) return { ok: false, pesan: TANPA_AKSES.pesan };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, pesan: "Tidak ada baris yang bisa diimpor." };
  if (rows.length > MAKS_BARIS) return { ok: false, pesan: `Maksimal ${MAKS_BARIS} baris sekali impor.` };
  // validasi ulang di server — jangan percaya data dari browser
  const skema = jenis === "siswa" ? imporSiswaBaris : imporPegawaiBaris;
  const bersih = [];
  for (let i = 0; i < rows.length; i++) {
    const p = skema.safeParse(rows[i]);
    if (!p.success) return { ok: false, pesan: `Baris ${i + 1}: ${Object.values(pesanError(p.error)).join(", ")}` };
    bersih.push(p.data);
  }
  const { data, error } =
    jenis === "siswa"
      ? await ctx.supabase.rpc("impor_siswa", { data: bersih, perbarui: opsi.perbarui, buat_kelas: opsi.buatKelas })
      : await ctx.supabase.rpc("impor_pegawai", { data: bersih, perbarui: opsi.perbarui });
  if (error) {
    console.error("[impor] gagal:", error.code, error.message);
    const pesan = error.message.startsWith("Baris") || error.message.startsWith("Belum")
      ? error.message.replace(/new row for relation "(\w+)" violates check constraint "(\w+)"/, "isian tidak valid ($2)")
      : pesanDb(error);
    return { ok: false, pesan: `Impor dibatalkan, tidak ada data yang tersimpan. ${pesan}` };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, pesan: "Impor selesai.", hasil: data as Record<string, number> };
}
