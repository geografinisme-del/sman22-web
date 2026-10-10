"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAkses } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";

export async function simpanTemuanStatus(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const st = z.enum(["terbuka", "tindak_lanjut", "verifikasi", "ditutup"]).safeParse(String(form.get("status")));
  if (id.success && st.success) await supabase.from("temuan_mutu").update({ status: st.data, updated_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/mutu", "layout");
  redirect("/admin/mutu/temuan?pesan=tersimpan");
}
