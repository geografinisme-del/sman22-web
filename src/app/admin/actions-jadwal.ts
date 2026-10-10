"use server";

import { revalidatePath } from "next/cache";
import { kirimSegera } from "@/lib/notif/kirim";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { geserTanggal, hariIniWIB, tanggalValid } from "@/lib/admin/absensi";
import { kunciKelas } from "@/lib/admin/induk";
import { buatJam, kunciNama, polaJamSchema, uraiTempel } from "@/lib/admin/jadwal";
import { pesanError } from "@/lib/admin/schema";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const uuid = z.string().uuid();
const uuidAtauKosong = z.union([uuid, z.literal("")]).transform((v) => v || null);

function pesanDb(e: { code?: string; message: string }) {
  console.error("[jadwal]", e.code, e.message);
  if (e.code === "42501") return "Akses ditolak.";
  if (e.code === "23P01") return e.message;
  if (e.code === "23505") {
    if (/jadwal_guru_unik/.test(e.message)) return "Bentrok: guru tersebut sudah mengajar di kelas lain pada jam yang sama.";
    if (/jadwal_ruang_unik/.test(e.message)) return "Bentrok: ruang sudah dipakai kelas lain pada jam yang sama.";
    if (/mapel_nama_unik|ruang_nama_unik/.test(e.message)) return "Nama tersebut sudah ada.";
    if (/penugasan_unik/.test(e.message)) return "Mapel ini sudah ada di kelas tersebut.";
    if (/piket_guru/.test(e.message)) return "Guru tersebut sudah terjadwal piket pada hari itu.";
    if (/perubahan_jadwal/.test(e.message)) return "Jam pelajaran ini sudah punya perubahan pada tanggal itu. Hapus dulu yang lama.";
    return "Data sudah ada.";
  }
  if (["22023", "P0002", "23514"].includes(e.code ?? "")) return e.message;
  return "Gagal menyimpan. Coba lagi.";
}
const segarkan = () => {
  revalidatePath("/admin/jadwal", "layout");
  revalidatePath("/admin/jadwal-saya");
  revalidatePath("/portal/jadwal");
};

/* ============================ Mapel & ruang ============================ */

export async function simpanMapel(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      id: uuidAtauKosong,
      nama: z.string().trim().min(2, "Minimal 2 huruf").max(100),
      kode: z.string().trim().max(20).default(""),
      kelompok: z.enum(["umum", "pilihan", "muatan_lokal", "lainnya"]),
    })
    .safeParse({ id: String(form.get("id") ?? ""), nama: form.get("nama"), kode: form.get("kode") ?? "", kelompok: form.get("kelompok") || "umum" });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian mapel.", errors: pesanError(parsed.error) };
  const { id, ...d } = parsed.data;
  const { error } = id ? await ctx.supabase.from("mapel").update(d).eq("id", id) : await ctx.supabase.from("mapel").insert(d);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `Mapel ${d.nama} tersimpan.` };
}

export async function simpanRuang(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      nama: z.string().trim().min(1, "Wajib diisi").max(60),
      jenis: z.enum(["kelas", "laboratorium", "lapangan", "lainnya"]),
      kapasitas: z.union([z.literal(""), z.coerce.number().int().min(1).max(500)]).transform((v) => (v === "" ? null : v)),
    })
    .safeParse({ nama: form.get("nama"), jenis: form.get("jenis") || "kelas", kapasitas: String(form.get("kapasitas") ?? "") });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian ruang.", errors: pesanError(parsed.error) };
  const { error } = await ctx.supabase.from("ruang").insert(parsed.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `Ruang ${parsed.data.nama} ditambahkan.` };
}

export async function arsipReferensi(form: FormData) {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const tabel = z.enum(["mapel", "ruang"]).safeParse(form.get("tabel"));
  const id = uuid.safeParse(String(form.get("id")));
  if (!tabel.success || !id.success) redirect("/admin/jadwal/pengaturan?pesan=gagal");
  if (tabel.data === "mapel") {
    const { count } = await ctx.supabase.from("penugasan_mengajar").select("id", { count: "exact", head: true }).eq("mapel_id", id.data).is("deleted_at", null);
    if (count) redirect("/admin/jadwal/pengaturan?pesan=mapel-dipakai");
  }
  const { error } = await ctx.supabase.from(tabel.data).update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  if (error) {
    console.error("[jadwal] arsip:", error.message);
    redirect("/admin/jadwal/pengaturan?pesan=gagal");
  }
  segarkan();
  redirect("/admin/jadwal/pengaturan?pesan=diarsipkan");
}

/* ============================ Jam pelajaran ============================ */

export async function aturJamPelajaran(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) return TANPA_AKSES;
  const jeda = [0, 1, 2].map((i) => ({
    setelah: String(form.get(`jeda_setelah_${i}`) ?? ""),
    menit: String(form.get(`jeda_menit_${i}`) ?? ""),
    jenis: String(form.get(`jeda_jenis_${i}`) ?? "istirahat"),
    label: String(form.get(`jeda_label_${i}`) ?? ""),
  })).filter((j) => j.setelah !== "" && j.menit !== "");
  const parsed = polaJamSchema.safeParse({
    hari: form.getAll("hari").map(String),
    masuk: String(form.get("masuk") ?? ""),
    durasi: String(form.get("durasi") ?? "40"),
    jumlah: String(form.get("jumlah") ?? ""),
    awal_jenis: String(form.get("awal_jenis") ?? ""),
    awal_menit: String(form.get("awal_menit") || "0"),
    awal_label: String(form.get("awal_label") ?? ""),
    jeda,
  });
  if (!parsed.success) return { ok: false, pesan: "Periksa pengaturan jam.", errors: pesanError(parsed.error) };
  const { hari, ...pola } = parsed.data;
  let isi;
  try {
    isi = buatJam(pola);
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  for (const h of hari) {
    const { error } = await ctx.supabase.rpc("atur_jam_hari", { p_hari: h, p_isi: isi });
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  segarkan();
  return { ok: true, pesan: `Jam pelajaran tersimpan untuk ${hari.length} hari (${pola.jumlah} JP, selesai ${isi.at(-1)?.jam_selesai}).` };
}

export async function kosongkanJamHari(form: FormData) {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const h = z.coerce.number().int().min(1).max(7).safeParse(form.get("hari"));
  if (!h.success) redirect("/admin/jadwal/pengaturan?pesan=gagal");
  const { error } = await ctx.supabase.rpc("atur_jam_hari", { p_hari: h.data, p_isi: [] });
  if (error) redirect("/admin/jadwal/pengaturan?pesan=jam-dipakai");
  segarkan();
  redirect("/admin/jadwal/pengaturan?pesan=tersimpan");
}

/* ============================ Penugasan mengajar ============================ */

export async function simpanPenugasan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      id: uuidAtauKosong,
      kelas_id: uuid,
      mapel_id: z.string().uuid("Pilih mapel"),
      pegawai_id: uuidAtauKosong,
      jp_per_minggu: z.coerce.number().int().min(0, "0–20").max(20, "0–20"),
    })
    .safeParse({
      id: String(form.get("id") ?? ""),
      kelas_id: String(form.get("kelas_id") ?? ""),
      mapel_id: String(form.get("mapel_id") ?? ""),
      pegawai_id: String(form.get("pegawai_id") ?? ""),
      jp_per_minggu: String(form.get("jp_per_minggu") ?? ""),
    });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian penugasan.", errors: pesanError(parsed.error) };
  const { id, ...d } = parsed.data;
  const { error } = id
    ? await ctx.supabase.from("penugasan_mengajar").update({ pegawai_id: d.pegawai_id, jp_per_minggu: d.jp_per_minggu }).eq("id", id)
    : await ctx.supabase.from("penugasan_mengajar").insert(d);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Penugasan tersimpan." };
}

export async function arsipPenugasan(form: FormData) {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const kelas = String(form.get("kelas_id") ?? "");
  if (!id.success) redirect("/admin/jadwal/penugasan?pesan=gagal");
  const { error } = await ctx.supabase.from("penugasan_mengajar").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  if (error) console.error("[jadwal] arsip penugasan:", error.message);
  segarkan();
  redirect(`/admin/jadwal/penugasan?kelas=${encodeURIComponent(kelas)}&pesan=${error ? "gagal" : "diarsipkan"}`);
}

export async function imporPenugasan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) return TANPA_AKSES;
  const { data: baris, galat } = uraiTempel(String(form.get("teks") ?? ""));
  if (!baris.length && !galat.length) return { ok: false, pesan: "Tempelkan data dari Excel terlebih dahulu." };
  if (baris.length > 1500) return { ok: false, pesan: "Maksimal 1.500 baris sekali impor." };

  const { data: ta } = await ctx.supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  if (!ta) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const [{ data: kelas }, { data: mapel }, { data: guru }] = await Promise.all([
    ctx.supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null),
    ctx.supabase.from("mapel").select("id, nama, kode").is("deleted_at", null),
    ctx.supabase.from("pegawai").select("id, nama, nip").is("deleted_at", null).eq("status", "aktif"),
  ]);
  const petaKelas = new Map((kelas ?? []).map((k) => [kunciKelas(k.nama), k.id as string]));
  const petaMapel = new Map<string, string>();
  for (const m of mapel ?? []) {
    petaMapel.set(kunciNama(m.nama), m.id);
    if (m.kode) petaMapel.set(kunciNama(m.kode), m.id);
  }
  const petaGuru = new Map<string, string[]>();
  for (const g of guru ?? []) {
    for (const k of [kunciNama(g.nama), g.nip ?? ""].filter(Boolean)) petaGuru.set(k, [...(petaGuru.get(k) ?? []), g.id]);
  }

  // mapel yang belum ada dibuat otomatis
  const mapelBaru = [...new Map(baris.filter((b) => !petaMapel.has(kunciNama(b.mapel))).map((b) => [kunciNama(b.mapel), b.mapel])).values()];
  const salah = [...galat];
  const isi: { kelas_id: string; mapel_id: string; pegawai_id: string | null; jp_per_minggu: number }[] = [];
  const kunciUnik = new Set<string>();
  for (const b of baris) {
    const k = petaKelas.get(kunciKelas(b.kelas));
    if (!k) salah.push(`Baris ${b.baris}: kelas "${b.kelas}" tidak ada di tahun ajaran aktif`);
    let g: string | null = null;
    if (b.guru) {
      const cocok = petaGuru.get(/^\d{18}$/.test(b.guru) ? b.guru : kunciNama(b.guru)) ?? [];
      if (cocok.length === 1) g = cocok[0];
      else salah.push(`Baris ${b.baris}: guru "${b.guru}" ${cocok.length ? "namanya ganda, pakai NIP" : "tidak ditemukan di data guru"}`);
    }
    const kunci = `${k}|${kunciNama(b.mapel)}`;
    if (kunciUnik.has(kunci)) salah.push(`Baris ${b.baris}: ${b.kelas} – ${b.mapel} ditulis dua kali`);
    kunciUnik.add(kunci);
    if (k) isi.push({ kelas_id: k, mapel_id: kunciNama(b.mapel), pegawai_id: g, jp_per_minggu: b.jp });
  }
  if (salah.length) {
    return { ok: false, pesan: `Tidak ada yang disimpan. Perbaiki ${salah.length} baris berikut lalu tempel ulang:\n${salah.slice(0, 15).join("\n")}${salah.length > 15 ? `\n…dan ${salah.length - 15} lagi` : ""}` };
  }
  if (mapelBaru.length) {
    const { data: dibuat, error } = await ctx.supabase.from("mapel").insert(mapelBaru.map((nama) => ({ nama }))).select("id, nama");
    if (error) return { ok: false, pesan: pesanDb(error) };
    for (const m of dibuat ?? []) petaMapel.set(kunciNama(m.nama), m.id);
  }
  const final = isi.map((r) => ({ ...r, mapel_id: petaMapel.get(r.mapel_id)! }));
  const { data: n, error } = await ctx.supabase.rpc("impor_penugasan", { p_isi: final });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `${n} penugasan tersimpan${mapelBaru.length ? `, ${mapelBaru.length} mapel baru dibuat (${mapelBaru.join(", ")})` : ""}.` };
}

/* ============================ Jadwal per kelas ============================ */

const isiJadwal = z
  .array(z.object({ hari: z.number().int().min(1).max(7), jp_ke: z.number().int().min(1).max(15), penugasan_id: uuid, ruang_id: uuid.nullable() }))
  .max(105);

export async function simpanJadwalKelas(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) return TANPA_AKSES;
  const kelas = uuid.safeParse(String(form.get("kelas_id")));
  let mentah: unknown;
  try {
    mentah = JSON.parse(String(form.get("isi") ?? "[]"));
  } catch {
    mentah = null;
  }
  const isi = isiJadwal.safeParse(mentah);
  if (!kelas.success || !isi.success) return { ok: false, pesan: "Data jadwal tidak valid. Muat ulang halaman." };
  const { error } = await ctx.supabase.rpc("simpan_jadwal_kelas", { p_kelas: kelas.data, p_isi: isi.data });
  if (error) return { ok: false, pesan: error.code === "23P01" ? `${error.message}\nTidak ada perubahan yang disimpan.` : pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `Jadwal tersimpan (${isi.data.length} JP).` };
}

/* ============================ Piket ============================ */

export async function aturPiket(form: FormData) {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const aksi = String(form.get("aksi"));
  if (aksi === "hapus") {
    const id = uuid.safeParse(String(form.get("id")));
    if (id.success) await ctx.supabase.from("piket_guru").delete().eq("id", id.data);
  } else {
    const h = z.coerce.number().int().min(1).max(7).safeParse(form.get("hari"));
    const g = uuid.safeParse(String(form.get("pegawai_id")));
    const { data: ta } = await ctx.supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
    if (!h.success || !g.success || !ta) redirect("/admin/jadwal/pengaturan?pesan=gagal#piket");
    const { error } = await ctx.supabase.from("piket_guru").insert({ hari: h.data, pegawai_id: g.data, tahun_ajaran_id: ta.id });
    if (error) {
      console.error("[jadwal] piket:", error.message);
      redirect("/admin/jadwal/pengaturan?pesan=gagal#piket");
    }
  }
  segarkan();
  redirect("/admin/jadwal/pengaturan?pesan=tersimpan#piket");
}

/* ============================ Perubahan / guru pengganti ============================ */

export async function simpanPerubahan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = (await aksesAksi("jadwal.pengganti")) ?? (await aksesAksi("jadwal.kelola"));
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      jadwal_id: uuid,
      tanggal: z
        .string()
        .refine(tanggalValid, "Tanggal tidak valid")
        .refine((t) => t >= geserTanggal(hariIniWIB(), -7) && t <= geserTanggal(hariIniWIB(), 90), "Tanggal di luar rentang (7 hari lalu s.d. 90 hari ke depan)"),
      jenis: z.enum(["pengganti", "tugas", "ditiadakan", "pindah_ruang"]),
      pegawai_pengganti_id: uuidAtauKosong,
      ruang_id: uuidAtauKosong,
      catatan: z.string().trim().max(300).default(""),
    })
    .refine((d) => d.jenis !== "pengganti" || d.pegawai_pengganti_id, { path: ["pegawai_pengganti_id"], message: "Pilih guru pengganti" })
    .refine((d) => d.jenis !== "pindah_ruang" || d.ruang_id, { path: ["ruang_id"], message: "Pilih ruang" })
    .safeParse({
      jadwal_id: String(form.get("jadwal_id") ?? ""),
      tanggal: String(form.get("tanggal") ?? ""),
      jenis: String(form.get("jenis") ?? ""),
      pegawai_pengganti_id: String(form.get("pegawai_pengganti_id") ?? ""),
      ruang_id: String(form.get("ruang_id") ?? ""),
      catatan: String(form.get("catatan") ?? ""),
    });
  if (!parsed.success) return { ok: false, pesan: parsed.error.issues[0].message, errors: pesanError(parsed.error) };
  const { error } = await ctx.supabase.from("perubahan_jadwal").insert(parsed.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  segarkan();
  return { ok: true, pesan: "Perubahan tersimpan. Guru, siswa, dan orang tua melihatnya di jadwal hari itu." };
}

export async function hapusPerubahan(form: FormData) {
  const ctx = (await aksesAksi("jadwal.pengganti")) ?? (await aksesAksi("jadwal.kelola"));
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const kembali = String(form.get("kembali") ?? "/admin/jadwal/pengganti");
  if (!id.success) redirect("/admin/jadwal/pengganti?pesan=gagal");
  const { error } = await ctx.supabase.from("perubahan_jadwal").delete().eq("id", id.data);
  if (error) console.error("[jadwal] hapus perubahan:", error.message);
  segarkan();
  redirect(`${kembali.startsWith("/admin/jadwal/pengganti") ? kembali : "/admin/jadwal/pengganti"}${kembali.includes("?") ? "&" : "?"}pesan=${error ? "gagal" : "dibatalkan-perubahan"}`);
}
