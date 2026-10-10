"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import { uraiAnggaran, uraiIsian } from "@/lib/ekskul";
import { dariLokalWIB } from "@/lib/lms";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const tgl = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")]);
const https = z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Harus diawali https://").max(500)]);
function pesanDb(e: { code?: string; message: string }) {
  console.error("[ekskul]", e.code, e.message);
  if (["22023", "23P01"].includes(e.code ?? "")) return e.message;
  if (e.code === "23505") return "Nama atau alamat (slug) sudah dipakai organisasi lain.";
  if (e.code === "42501") return "Akses ditolak — fitur ini sesuai jabatan Anda di organisasi.";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi.";
}
const segarkan = (org?: string) => {
  revalidatePath("/admin/ekskul", "layout");
  revalidatePath("/portal/ekskul", "layout");
  revalidatePath("/ekskul", "layout");
  if (org) revalidatePath(`/admin/ekskul/${org}`);
};
async function sesi() {
  const { supabase } = await getAkses();
  return supabase;
}

/* ============================ Organisasi ============================ */

export async function simpanOrganisasi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      jenis: z.enum(["ekskul", "osis", "mpk", "komunitas"]),
      nama: z.string().trim().min(2, "Nama wajib").max(100),
      slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Huruf kecil, angka, dan tanda hubung").max(60),
      singkatan: z.string().trim().max(20),
      bidang: z.enum(["olahraga", "seni", "akademik", "keagamaan", "teknologi", "organisasi", "lainnya"]),
      deskripsi: z.string().trim().max(3000),
      logo_url: https,
      warna: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid"),
      jadwal_rutin: z.string().trim().max(200),
      tempat: z.string().trim().max(100),
      kuota: z.coerce.number().int().min(0).max(1000),
      syarat: z.string().trim().max(1000),
      daftar_mulai: tgl, daftar_selesai: tgl,
      tampil_publik: z.boolean(), aktif: z.boolean(),
      tingkat_boleh: z.array(z.enum(["X", "XI", "XII"])).min(1, "Pilih minimal satu tingkat"),
    })
    .refine((d) => !d.daftar_mulai || !d.daftar_selesai || d.daftar_selesai >= d.daftar_mulai, { path: ["daftar_selesai"], message: "Harus setelah tanggal mulai" })
    .safeParse({
      ...ambil(form, "jenis", "nama", "slug", "singkatan", "bidang", "deskripsi", "logo_url", "warna", "jadwal_rutin", "tempat", "syarat", "daftar_mulai", "daftar_selesai"),
      kuota: String(form.get("kuota") || "0"), tampil_publik: form.get("tampil_publik") === "on", aktif: form.get("aktif") === "on" || !form.has("aktif_ada"),
      tingkat_boleh: form.getAll("tingkat_boleh").map(String),
    });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const isian = uraiIsian(String(form.get("field_tambahan") ?? ""));
  if (!isian.ok) return { ok: false, pesan: isian.pesan, errors: { field_tambahan: isian.pesan } };
  const galeri = String(form.get("galeri") ?? "").split(/\s+/).map((x) => x.trim()).filter(Boolean);
  if (galeri.length > 12 || galeri.some((g) => !/^https:\/\/\S+$/.test(g))) return { ok: false, pesan: "Galeri: maksimal 12 tautan https://", errors: { galeri: "Tautan tidak valid" } };
  const baris = { ...p.data, daftar_mulai: p.data.daftar_mulai || null, daftar_selesai: p.data.daftar_selesai || null, field_tambahan: isian.data, galeri };
  const r = id && uuid.safeParse(id).success
    ? await supabase.from("organisasi").update(baris).eq("id", id).select("id").single()
    : await supabase.from("organisasi").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan(r.data.id);
  if (!id) redirect(`/admin/ekskul/${r.data.id}?tab=profil&pesan=tersimpan`);
  return { ok: true, pesan: "Profil organisasi tersimpan." };
}

export async function aturPembina(form: FormData) {
  const ctx = await aksesAksi("ekskul.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const org = uuid.safeParse(String(form.get("organisasi_id")));
  const peg = uuid.safeParse(String(form.get("pegawai_id")));
  if (org.success && peg.success) {
    if (form.get("aksi") === "hapus") await ctx.supabase.from("pembina_organisasi").delete().eq("organisasi_id", org.data).eq("pegawai_id", peg.data);
    else await ctx.supabase.from("pembina_organisasi").upsert({ organisasi_id: org.data, pegawai_id: peg.data });
  }
  segarkan(org.success ? org.data : undefined);
  redirect(`/admin/ekskul/${org.success ? org.data : ""}?tab=profil&pesan=tersimpan`);
}

export async function simpanPengaturanEkskul(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("ekskul.kelola");
  if (!ctx) return TANPA_AKSES;
  const n = z.coerce.number().int().min(1).max(5).safeParse(form.get("maks_pilihan"));
  if (!n.success) return { ok: false, pesan: "1–5", errors: { maks_pilihan: "1–5" } };
  const { error } = await ctx.supabase.from("pengaturan_ekskul").update({ maks_pilihan: n.data }).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Batas pilihan ekskul tersimpan." };
}

/* ============================ Pendaftaran & anggota ============================ */

export async function daftarEkskul(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const org = uuid.safeParse(String(form.get("organisasi_id")));
  if (!org.success) return { ok: false, pesan: "Data tidak valid." };
  const jawaban: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (/^f\d{1,2}$/.test(k) && typeof v === "string") jawaban[k] = v.slice(0, 500);
  const { error } = await supabase.rpc("daftar_ekskul", {
    p_org: org.data, p_pilihan: Number(form.get("pilihan") || 1), p_alasan: String(form.get("alasan") ?? "").slice(0, 500), p_jawaban: jawaban,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect("/portal/ekskul?pesan=terdaftar");
}

export async function mundurEkskul(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/masuk");
  const id = uuid.safeParse(String(form.get("id")));
  const r = id.success ? await supabase.rpc("mundur_ekskul", { p_id: id.data }) : { error: { message: "Data tidak valid" } };
  segarkan();
  redirect(`/portal/ekskul?${r.error ? `galat=${encodeURIComponent(r.error.message.slice(0, 200))}` : "pesan=tersimpan"}`);
}

export async function putuskanPendaftaran(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const org = String(form.get("organisasi_id") ?? "");
  const r = id.success
    ? await supabase.rpc("putuskan_pendaftaran", { p_id: id.data, p_terima: form.get("aksi") === "terima", p_catatan: String(form.get("catatan") ?? "").slice(0, 300) })
    : { error: { message: "Data tidak valid" }, data: null };
  segarkan(org);
  redirect(`/admin/ekskul/${uuid.safeParse(org).success ? org : ""}?tab=pendaftaran&${r.error ? `galat=${encodeURIComponent(r.error.message.slice(0, 200))}` : "pesan=tersimpan"}`);
}

export async function ubahAnggota(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const org = String(form.get("organisasi_id") ?? "");
  const jab = z.enum(["anggota", "ketua", "wakil_ketua", "sekretaris", "bendahara", "koordinator"]).safeParse(String(form.get("jabatan")));
  let galat = "";
  if (id.success) {
    const ubah = form.get("aksi") === "keluar" ? { status: "keluar" } : jab.success ? { jabatan: jab.data, bidang: String(form.get("bidang") ?? "").slice(0, 60) } : null;
    if (ubah) {
      const { error, count } = await supabase.from("keanggotaan_org").update(ubah, { count: "exact" }).eq("id", id.data);
      if (error || !count) galat = error ? pesanDb(error) : "Akses ditolak.";
    }
  }
  segarkan(org);
  redirect(`/admin/ekskul/${uuid.safeParse(org).success ? org : ""}?tab=anggota&${galat ? `galat=${encodeURIComponent(galat)}` : "pesan=tersimpan"}`);
}

/* ============================ Kegiatan & presensi ============================ */

const kembaliOrg = (form: FormData, org: string, tab: string) => {
  const k = String(form.get("kembali") ?? "");
  return /^\/portal\/ekskul\/[0-9a-f-]{36}$/.test(k) ? `${k}?` : `/admin/ekskul/${org}?tab=${tab}&`;
};

export async function simpanKegiatanOrg(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      organisasi_id: uuid,
      judul: z.string().trim().min(3, "Isi judul").max(150),
      jenis: z.enum(["latihan", "rapat", "acara", "lomba", "lainnya"]),
      mulai: z.string().min(1, "Isi waktu mulai"), selesai: z.string().min(1, "Isi waktu selesai"),
      tempat: z.string().trim().max(100),
      deskripsi: z.string().trim().max(1000),
      publik: z.boolean(),
    })
    .safeParse({ ...ambil(form, "organisasi_id", "judul", "jenis", "mulai", "selesai", "tempat", "deskripsi"), publik: form.get("publik") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const mulai = dariLokalWIB(p.data.mulai), selesai = dariLokalWIB(p.data.selesai);
  if (!mulai || !selesai || Date.parse(selesai) < Date.parse(mulai)) return { ok: false, pesan: "Periksa waktu mulai/selesai.", errors: { selesai: "Harus setelah mulai" } };
  const baris = { ...p.data, mulai, selesai };
  const r = uuid.safeParse(id).success ? await supabase.from("kegiatan_org").update(baris).eq("id", id) : await supabase.from("kegiatan_org").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan(p.data.organisasi_id);
  return { ok: true, pesan: "Kegiatan tersimpan." };
}

export async function simpanPresensiOrg(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const kg = uuid.safeParse(String(form.get("kegiatan_id")));
  if (!kg.success) return { ok: false, pesan: "Data tidak valid." };
  const data: { siswa_id: string; status: string }[] = [];
  for (const [k, v] of form.entries()) {
    const m = k.match(/^s_([0-9a-f-]{36})$/);
    if (m && ["hadir", "izin", "sakit", "alpa"].includes(String(v))) data.push({ siswa_id: m[1], status: String(v) });
  }
  const { data: n, error } = await supabase.rpc("isi_presensi_org", { p_kegiatan: kg.data, p_data: data });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan(String(form.get("organisasi_id") ?? ""));
  return { ok: true, pesan: `Presensi ${n} anggota tersimpan.` };
}

export async function hapusKegiatanOrg(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const org = String(form.get("organisasi_id") ?? "");
  let galat = "";
  if (id.success) {
    const { count: ada } = await supabase.from("presensi_org").select("siswa_id", { count: "exact", head: true }).eq("kegiatan_id", id.data);
    if (ada) galat = "Kegiatan yang sudah ada presensinya tidak dapat dihapus.";
    else { const { error } = await supabase.from("kegiatan_org").delete().eq("id", id.data); if (error) galat = pesanDb(error); }
  }
  segarkan(org);
  redirect(`${kembaliOrg(form, org, "kegiatan")}${galat ? `galat=${encodeURIComponent(galat)}` : "pesan=tersimpan"}`);
}

/* ============================ Program kerja ============================ */

export async function simpanProker(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      organisasi_id: uuid,
      judul: z.string().trim().min(3, "Isi nama program").max(150),
      tujuan: z.string().trim().max(1000),
      target_waktu: z.string().trim().max(60),
      indikator: z.string().trim().max(300),
      anggaran: z.coerce.number().min(0).max(1e12),
      status: z.enum(["rencana", "berjalan", "selesai", "batal"]),
      evaluasi: z.string().trim().max(1000),
    })
    .safeParse({ ...ambil(form, "organisasi_id", "judul", "tujuan", "target_waktu", "indikator", "status", "evaluasi"), anggaran: String(form.get("anggaran") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { data: ta } = await supabase.rpc("tahun_aktif_id");
  if (!ta) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const baris = { ...p.data, tahun_ajaran_id: ta as string, updated_at: new Date().toISOString() };
  const r = uuid.safeParse(id).success ? await supabase.from("program_kerja").update(baris).eq("id", id) : await supabase.from("program_kerja").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan(p.data.organisasi_id);
  return { ok: true, pesan: "Program kerja tersimpan." };
}

/* ============================ Pengajuan kegiatan ============================ */

export async function simpanPengajuan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      organisasi_id: uuid,
      judul: z.string().trim().min(3, "Isi nama kegiatan").max(150),
      tujuan: z.string().trim().max(2000),
      mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal"), selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal"),
      tempat: z.string().trim().max(150),
      sasaran_peserta: z.coerce.number().int().min(0).max(10000),
      risiko: z.string().trim().max(1500), mitigasi: z.string().trim().max(1500),
      kebutuhan_sarpras: z.string().trim().max(1000),
      sumber_dana: z.string().trim().max(100),
    })
    .refine((d) => d.selesai >= d.mulai, { path: ["selesai"], message: "Harus setelah tanggal mulai" })
    .safeParse({ ...ambil(form, "organisasi_id", "judul", "tujuan", "mulai", "selesai", "tempat", "risiko", "mitigasi", "kebutuhan_sarpras", "sumber_dana"), sasaran_peserta: String(form.get("sasaran_peserta") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const ang = uraiAnggaran(String(form.get("anggaran") ?? ""));
  if (!ang.ok) return { ok: false, pesan: ang.pesan, errors: { anggaran: ang.pesan } };
  const baris = { ...p.data, anggaran: ang.data };
  const r = uuid.safeParse(id).success
    ? await supabase.from("pengajuan_kegiatan").update(baris).eq("id", id).select("id").single()
    : await supabase.from("pengajuan_kegiatan").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan(p.data.organisasi_id);
  revalidatePath(`/admin/ekskul/pengajuan/${r.data.id}`);
  if (!id) {
    const k = String(form.get("kembali") ?? "");
    redirect(/^\/portal\/ekskul\/[0-9a-f-]{36}$/.test(k) ? `${k}?pesan=tersimpan#pengajuan` : `/admin/ekskul/pengajuan/${r.data.id}?pesan=tersimpan`);
  }
  return { ok: true, pesan: "Pengajuan tersimpan." };
}

export async function simpanLpj(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  const p = z
    .object({
      lpj_ringkasan: z.string().trim().min(20, "Minimal 20 karakter").max(3000),
      lpj_realisasi: z.coerce.number().min(0).max(1e12),
      lpj_peserta: z.coerce.number().int().min(0).max(100000),
      lpj_tautan: https,
    })
    .safeParse({ ...ambil(form, "lpj_ringkasan", "lpj_tautan"), lpj_realisasi: String(form.get("lpj_realisasi") || "0"), lpj_peserta: String(form.get("lpj_peserta") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.from("pengajuan_kegiatan").update(p.data).eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  const kirim = form.get("kirim") === "1";
  if (kirim) {
    const { error: e2 } = await supabase.rpc("proses_pengajuan", { p_id: id.data, p_aksi: "lpj", p_catatan: "" });
    if (e2) return { ok: false, pesan: pesanDb(e2) };
  }
  revalidatePath(`/admin/ekskul/pengajuan/${id.data}`);
  segarkan();
  return { ok: true, pesan: kirim ? "LPJ dikirim ke kesiswaan." : "LPJ tersimpan (belum dikirim)." };
}

export async function prosesPengajuan(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) redirect("/admin/ekskul/pengajuan");
  const aksi = z.enum(["ajukan", "setujui", "revisi", "tolak", "terima_lpj", "tolak_lpj"]).catch("setujui").parse(String(form.get("aksi")));
  const { error } = await supabase.rpc("proses_pengajuan", { p_id: id.data, p_aksi: aksi, p_catatan: String(form.get("catatan") ?? "").slice(0, 1000) });
  segarkan();
  const k = String(form.get("kembali") ?? "");
  const tujuan = /^\/portal\/ekskul\/[0-9a-f-]{36}$/.test(k) ? `${k}?` : `/admin/ekskul/pengajuan/${id.data}?`;
  redirect(`${tujuan}${error ? `galat=${encodeURIComponent(pesanDb(error))}` : "pesan=tersimpan"}`);
}

/* ============================ Sertifikat & prestasi ============================ */

export async function terbitkanSertifikat(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const p = z
    .object({
      organisasi_id: uuid,
      jenis: z.enum(["keanggotaan", "kepengurusan", "penghargaan", "panitia", "peserta"]),
      judul: z.string().trim().min(3, "Isi judul sertifikat").max(150),
      keterangan: z.string().trim().max(300),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      siswa: z.array(uuid).min(1, "Pilih minimal satu anggota"),
    })
    .safeParse({ ...ambil(form, "organisasi_id", "jenis", "judul", "keterangan", "tanggal"), siswa: form.getAll("siswa").map(String) });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { data, error } = await supabase.rpc("terbitkan_sertifikat", {
    p_org: p.data.organisasi_id, p_siswa: p.data.siswa, p_jenis: p.data.jenis, p_judul: p.data.judul, p_keterangan: p.data.keterangan, p_tanggal: p.data.tanggal,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan(p.data.organisasi_id);
  return { ok: true, pesan: `${data} sertifikat diterbitkan. Anggota dapat mengunduhnya di portal.` };
}

export async function cabutSertifikat(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const org = String(form.get("organisasi_id") ?? "");
  if (id.success) await supabase.from("sertifikat_org").update({ dicabut: true }).eq("id", id.data);
  segarkan(org);
  redirect(`/admin/ekskul/${uuid.safeParse(org).success ? org : ""}?tab=sertifikat&pesan=tersimpan`);
}

export async function tautkanPrestasi(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const pr = uuid.safeParse(String(form.get("prestasi_id")));
  const org = uuid.safeParse(String(form.get("organisasi_id")));
  const r = pr.success && org.success ? await supabase.rpc("tautkan_prestasi_org", { p_prestasi: pr.data, p_org: org.data }) : { error: { message: "Data tidak valid" } };
  segarkan(org.success ? org.data : undefined);
  redirect(`/admin/ekskul/${org.success ? org.data : ""}?tab=sertifikat&${r.error ? `galat=${encodeURIComponent(r.error.message.slice(0, 200))}` : "pesan=tersimpan"}`);
}
