import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { DaftarMfa, FormTantangan } from "@/components/keamanan/Mfa";
import { FormGantiSandi } from "@/components/keamanan/FormSandi";
import { berperan, NAMA_PERAN, wajibLogin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";
import { aturWajibMfa, hapusFaktorMfa, keluarSemuaPerangkat } from "../../actions-keamanan";

export const metadata = { title: "Keamanan Akun" };

const PORTAL = ["siswa", "orang_tua"];

export default async function Keamanan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase, user, akses } = await wajibLogin();
  const [{ data: aal }, { data: f }, { data: peran }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
    supabase.from("peran").select("kode, nama, wajib_mfa").order("urutan"),
  ]);
  const faktor = (f?.totp ?? []).filter((x) => x.status === "verified");
  const wajib = (peran ?? []).filter((p) => p.wajib_mfa).map((p) => p.kode);
  const sayaWajib = (akses?.peran ?? []).some((p) => wajib.includes(p));
  const superAdmin = berperan(akses, "super_admin");
  const perluVerifikasi = faktor.length > 0 && aal?.currentLevel !== "aal2";

  return (
    <>
      <JudulHalaman judul="Keamanan Akun" deskripsi={`${user.email} · setiap perubahan di sini dicatat dan diberitahukan ke Anda.`} />
      <Notifikasi kode={pesan} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Kartu>
          <h2 className="text-2xl">Verifikasi dua langkah</h2>
          <p className="mt-1 text-sm text-black/60">
            Setelah memasukkan kata sandi, Anda diminta kode 6 angka dari aplikasi di HP. Akun tetap aman walau sandi bocor.
            {sayaWajib && <strong className="text-black"> Wajib untuk peran Anda.</strong>}
          </p>
          {faktor.length > 0 ? (
            <ul className="mt-4 divide-y divide-black/5 rounded-xl ring-1 ring-black/10">
              {faktor.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex-1">
                    <span className="block font-medium">{x.friendly_name || "Aplikasi autentikator"}</span>
                    <span className="text-xs text-black/50">Ditambahkan {formatTanggal(x.created_at.slice(0, 10))}</span>
                  </span>
                  {!perluVerifikasi && (
                    <form action={hapusFaktorMfa}>
                      <input type="hidden" name="factor_id" value={x.id} />
                      <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold text-blue-teks ring-1 ring-blue/30 hover:bg-red-50">Hapus</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Belum aktif.</p>
          )}
          {perluVerifikasi ? (
            <>
              <p className="mt-5 text-sm font-semibold">Masukkan kode untuk mengelola verifikasi dua langkah</p>
              <FormTantangan faktor={faktor.map((x) => ({ id: x.id, nama: x.friendly_name || "Aplikasi" }))} lanjut="/admin/keamanan" />
            </>
          ) : (
            <DaftarMfa
              lanjut="/admin/keamanan?pesan=mfa-aktif"
              teksTombol={faktor.length ? "Tambah aplikasi cadangan (HP kedua)" : "Aktifkan verifikasi dua langkah"}
            />
          )}
        </Kartu>

        <Kartu>
          <h2 className="mb-4 text-2xl">Ganti kata sandi</h2>
          <FormGantiSandi />
        </Kartu>

        <Kartu>
          <h2 className="text-2xl">Sesi login</h2>
          <p className="mt-1 text-sm text-black/60">
            Lupa keluar di komputer sekolah/warnet, atau curiga akun dipakai orang lain? Akhiri semua sesi, lalu ganti kata sandi.
          </p>
          <form action={keluarSemuaPerangkat} className="mt-4">
            <button type="submit" className="rounded-full bg-blue-teks px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Keluar dari semua perangkat
            </button>
          </form>
        </Kartu>

        {superAdmin && (
          <Kartu>
            <h2 id="wajib-mfa" className="text-2xl">Peran yang wajib verifikasi dua langkah</h2>
            <p className="mt-1 text-sm text-black/60">
              Selama belum memasukkan kode, izin dari peran ini <strong>ditahan oleh database</strong> (bukan hanya disembunyikan di layar).
              Super admin selalu wajib.
            </p>
            <ul className="mt-4 divide-y divide-black/5 rounded-xl ring-1 ring-black/10">
              {(peran ?? []).filter((p) => !PORTAL.includes(p.kode)).map((p) => (
                <li key={p.kode} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="flex-1">{NAMA_PERAN[p.kode] ?? p.nama}</span>
                  {p.wajib_mfa ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Wajib</span> : <span className="text-xs text-black/40">Opsional</span>}
                  {p.kode !== "super_admin" && (
                    <form action={aturWajibMfa}>
                      <input type="hidden" name="peran" value={p.kode} />
                      <input type="hidden" name="wajib" value={p.wajib_mfa ? "0" : "1"} />
                      <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-black/15 hover:bg-black/5">
                        {p.wajib_mfa ? "Jadikan opsional" : "Wajibkan"}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Kartu>
        )}
      </div>
    </>
  );
}
