"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { tanggalValid } from "@/lib/admin/absensi";
import { pesanError, uuid } from "@/lib/admin/schema";
import { kirimSegera } from "@/lib/notif/kirim";
import type { HasilAksi } from "./actions";

function pesanDb(e: { code?: string; message: string }) {
  console.error("[tukar]", e.code, e.message);
  if (["22023", "23P01", "23505", "42501"].includes(e.code ?? "")) return e.message;
  return "Gagal menyimpan. Coba lagi.";
}
const segarkan = () => {
  revalidatePath("/admin/tukar-jam");
  revalidatePath("/admin/jadwal/tukar");
  revalidatePath("/admin/jadwal-saya");
};

export async function ajukanTukar(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return { ok: false, pesan: "Sesi berakhir. Silakan masuk ulang." };
  const tanggal = z.string().refine(tanggalValid, "Pilih tanggal");
  const p = z
    .object({
      mitra: uuid,
      jadwal: uuid,
      tanggal,
      balas: z.enum(["tidak", "ya"]),
      jadwal_mitra: z.union([z.literal(""), uuid]),
      tanggal_mitra: z.union([z.literal(""), tanggal]),
      alasan: z.string().trim().min(5, "Tulis alasan (minimal 5 huruf)").max(300),
    })
    .refine((d) => d.balas === "tidak" || (d.jadwal_mitra && d.tanggal_mitra), { path: ["jadwal_mitra"], message: "Pilih jam & tanggal balasan" })
    .safeParse(Object.fromEntries(["mitra", "jadwal", "tanggal", "balas", "jadwal_mitra", "tanggal_mitra", "alasan"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message, errors: pesanError(p.error) };
  const d = p.data;
  const tukar = d.balas === "ya";
  const { error } = await supabase.rpc("ajukan_tukar_jadwal", {
    p_jadwal: d.jadwal,
    p_tanggal: d.tanggal,
    p_mitra: d.mitra,
    p_jadwal_mitra: tukar ? d.jadwal_mitra : null,
    p_tanggal_mitra: tukar ? d.tanggal_mitra : null,
    p_alasan: d.alasan,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  segarkan();
  redirect("/admin/tukar-jam?pesan=tukar-diajukan");
}

export async function jawabTukar(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) redirect("/admin/tukar-jam?pesan=gagal");
  const { error } = await supabase.rpc("jawab_tukar_jadwal", {
    p_id: id.data,
    p_terima: form.get("terima") === "1",
    p_catatan: String(form.get("catatan") ?? "").slice(0, 300),
  });
  if (error) {
    console.error("[tukar] jawab:", error.message);
    redirect(`/admin/tukar-jam?galat=${encodeURIComponent(error.message.slice(0, 200))}`);
  }
  kirimSegera();
  segarkan();
  redirect("/admin/tukar-jam?pesan=tukar-dijawab");
}

export async function batalkanTukar(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) {
    const { error } = await supabase.rpc("batalkan_tukar_jadwal", { p_id: id.data });
    if (error) console.error("[tukar] batal:", error.message);
  }
  segarkan();
  redirect("/admin/tukar-jam?pesan=izin-dibatalkan");
}

export async function putuskanTukar(form: FormData) {
  const ctx = await aksesAksi("jadwal.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) redirect("/admin/jadwal/tukar?pesan=gagal");
  const setuju = form.get("keputusan") === "setuju";
  const catatan = String(form.get("catatan") ?? "").slice(0, 300);
  if (!setuju && catatan.trim().length < 3) redirect("/admin/jadwal/tukar?pesan=perlu-alasan");
  const { error } = await ctx.supabase.rpc("putuskan_tukar_jadwal", { p_id: id.data, p_setuju: setuju, p_catatan: catatan });
  if (error) {
    console.error("[tukar] putus:", error.message);
    redirect(`/admin/jadwal/tukar?galat=${encodeURIComponent(error.message.slice(0, 200))}`);
  }
  kirimSegera();
  segarkan();
  revalidatePath("/admin/jadwal/pengganti");
  redirect("/admin/jadwal/tukar?pesan=tukar-diputus");
}
