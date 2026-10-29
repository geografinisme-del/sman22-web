import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { berperan, punya, wajibBoleh } from "@/lib/admin/auth";
import { akunDilindungi, BOLEH, peranDasar } from "@/lib/admin/akses-modul";
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
  const { supabase, akses } = await wajibBoleh(BOLEH.penggunaPeran);
  const penuh = punya(akses, "pengguna.kelola");
  // kolom jabatan baru ada setelah migrasi 20261225 — sebelum itu halaman tetap berfungsi tanpa jabatan
  const pilih = (kolom: string) => supabase.from("pengguna").select(kolom).eq("user_id", id).maybeSingle<{ user_id: string; nama: string; email: string; aktif: boolean; jabatan?: string | null; pengguna_peran: { peran: string }[] }>();
  const pertama = await pilih("user_id, nama, email, aktif, jabatan, pengguna_peran(peran)");
  let u = pertama.data;
  if (pertama.error) u = (await pilih("user_id, nama, email, aktif, pengguna_peran(peran)")).data;
  if (!u) notFound();
  const [{ data: peran }, { data: pegawaiBebas }, { data: tertaut }, { data: jabatan }] = await Promise.all([
    supabase.from("peran").select("kode, nama, keterangan").order("urutan"),
    supabase.from("pegawai").select("id, nama").is("user_id", null).is("deleted_at", null).order("nama").range(0, 999),
    supabase.from("pegawai").select("id, nama").eq("user_id", id).maybeSingle(),
    supabase.from("jabatan_gtk").select("kode, nama").eq("aktif", true).order("urutan"),
  ]);
  const pegawai = [...(tertaut ? [tertaut] : []), ...(pegawaiBebas ?? [])];
  const peranAkun = (u.pengguna_peran as { peran: string }[]).map((p) => p.peran);
  // operator tidak bisa mengubah akun yang punya peran di luar peran dasar (dijaga juga di server action & database)
  const terkunci = !penuh && akunDilindungi(peranAkun);
  // info login (service-role, melewati RLS) tidak dibaca selama "Lihat sebagai…"
  const authInfo = kunciAdminTersedia && !akses.pratinjau ? (await supabaseAdminAuth().getUserById(id)).data.user : null;
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
      {terkunci ? (
        <Kartu>
          <p className="text-sm text-black/70">
            Akun ini memiliki peran <strong>{peranAkun.join(", ")}</strong> yang hanya dapat diatur super admin. Anda dapat melihat datanya, tetapi tidak dapat mengubah peran, status, atau kata sandinya.
          </p>
        </Kartu>
      ) : (
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Kartu>
          <FormUbahPengguna
            peran={(peran ?? []).filter((p) => penuh || peranDasar(p.kode))}
            pegawai={pegawai}
            jabatan={jabatan ?? []}
            data={{ user_id: u.user_id, nama: u.nama, aktif: u.aktif, jabatan: u.jabatan ?? "", peran: (u.pengguna_peran as { peran: string }[]).map((p) => p.peran), pegawai_id: tertaut?.id ?? "" }}
          />
        </Kartu>
        <Kartu>
          <h2 className="mb-4 text-2xl">Kata sandi</h2>
          {kunciAdminTersedia ? (
            <FormSandi userId={u.user_id} />
          ) : (
            <p className="text-sm text-black/60">Atur ulang kata sandi lewat Supabase → Authentication → Users → pilih akun → Send password recovery.</p>
          )}
          {!akunPortal && (
            <form action={kirimTautanReset} className="mt-4 border-t border-black/10 pt-4">
              <input type="hidden" name="user_id" value={u.user_id} />
              <button type="submit" className="text-sm font-semibold text-blue-teks underline-offset-2 hover:underline">
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
                  <button type="submit" className="rounded-full px-4 py-2 text-xs font-semibold text-blue-teks ring-1 ring-blue/30 hover:bg-red-50">
                    Reset verifikasi dua langkah (HP hilang/ganti)
                  </button>
                </form>
              )}
            </div>
          )}
        </Kartu>
      </div>
      )}
    </>
  );
}
