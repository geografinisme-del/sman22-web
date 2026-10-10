import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { berperan, wajibIzin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";
import { DOMAIN_PORTAL } from "@/lib/portal";
import { kirimTautanReset, resetMfaPengguna } from "../../../actions-pengguna";
import { uuid } from "@/lib/admin/schema";
import { kunciAdminTersedia, supabaseAdminAuth } from "@/lib/supabase/admin";
import { FormSandi, FormUbahPengguna } from "../FormPengguna";

export const metadata = { title: "Ubah pengguna" };

export default async function UbahPengguna({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; tautan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibIzin("pengguna.kelola");
  const { data: u } = await supabase.from("pengguna").select("user_id, nama, email, aktif, pengguna_peran(peran)").eq("user_id", id).maybeSingle();
  if (!u) notFound();
  const [{ data: peran }, { data: pegawaiBebas }, { data: tertaut }] = await Promise.all([
    supabase.from("peran").select("kode, nama, keterangan").order("urutan"),
    supabase.from("pegawai").select("id, nama").is("user_id", null).is("deleted_at", null).order("nama").range(0, 999),
    supabase.from("pegawai").select("id, nama").eq("user_id", id).maybeSingle(),
  ]);
  const pegawai = [...(tertaut ? [tertaut] : []), ...(pegawaiBebas ?? [])];
  const authInfo = kunciAdminTersedia ? (await supabaseAdminAuth().getUserById(id)).data.user : null;
  const jumlahMfa = (authInfo?.factors ?? []).filter((f) => f.status === "verified").length;
  const akunPortal = u.email.endsWith(`@${DOMAIN_PORTAL}`);
  const waktu = (t?: string | null) => (t ? `${formatTanggal(t.slice(0, 10))}, ${new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB` : "belum pernah");

  return (
    <>
      <JudulHalaman judul={u.nama || u.email} deskripsi={u.email} aksi={<TombolLink href="/admin/pengguna" sekunder>← Semua pengguna</TombolLink>} />
      <Notifikasi kode={sp.pesan} />
      {sp.tautan === "gagal" && (
        <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Akun dibuat, tetapi belum tertaut ke data guru. Pilih data guru di bawah lalu simpan.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Kartu>
          <FormUbahPengguna
            peran={peran ?? []}
            pegawai={pegawai}
            data={{ user_id: u.user_id, nama: u.nama, aktif: u.aktif, peran: (u.pengguna_peran as { peran: string }[]).map((p) => p.peran), pegawai_id: tertaut?.id ?? "" }}
          />
        </Kartu>
        <Kartu>
          <h2 className="mb-4 font-serif text-2xl">Kata sandi</h2>
          {kunciAdminTersedia ? (
            <FormSandi userId={u.user_id} />
          ) : (
            <p className="text-sm text-black/60">Atur ulang kata sandi lewat Supabase → Authentication → Users → pilih akun → Send password recovery.</p>
          )}
          {!akunPortal && (
            <form action={kirimTautanReset} className="mt-4 border-t border-black/10 pt-4">
              <input type="hidden" name="user_id" value={u.user_id} />
              <button type="submit" className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">
                Kirim tautan atur ulang ke {u.email}
              </button>
              <p className="mt-1 text-xs text-black/50">Lebih aman: pemilik akun membuat sandinya sendiri.</p>
            </form>
          )}
          {authInfo && (
            <div className="mt-6 border-t border-black/10 pt-4 text-sm">
              <h3 className="font-semibold">Keamanan</h3>
              <p className="mt-1 text-black/60">Terakhir masuk: {waktu(authInfo.last_sign_in_at)}</p>
              <p className="text-black/60">Verifikasi dua langkah: {jumlahMfa ? `aktif (${jumlahMfa} aplikasi)` : "belum aktif"}</p>
              {jumlahMfa > 0 && berperan(akses, "super_admin") && u.user_id !== akses.userId && (
                <form action={resetMfaPengguna} className="mt-3">
                  <input type="hidden" name="user_id" value={u.user_id} />
                  <button type="submit" className="rounded-full px-4 py-2 text-xs font-semibold text-merah ring-1 ring-merah/30 hover:bg-red-50">
                    Reset verifikasi dua langkah (HP hilang/ganti)
                  </button>
                </form>
              )}
            </div>
          )}
        </Kartu>
      </div>
    </>
  );
}
