import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { DaftarMfa, FormTantangan } from "@/components/keamanan/Mfa";
import { FormGantiSandi } from "@/components/keamanan/FormSandi";
import { berperan, NAMA_PERAN, wajibLogin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";
import { waktuWIB } from "@/lib/admin/label-audit";
import { aturWajibMfa, hapusFaktorMfa } from "../../actions-keamanan";
import { TombolKeluarSemua } from "@/components/keamanan/TombolKeluarSemua";

export const metadata = { title: "Keamanan Akun" };

const PORTAL = ["siswa", "orang_tua"];

export default async function Keamanan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase, user, akses } = await wajibLogin();
  const [{ data: aal }, { data: f }, { data: peran }, { data: riwayatPratinjau }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
    supabase.from("peran").select("kode, nama, wajib_mfa").order("urutan"),
    // catatan "Lihat sebagai…" (audit_log; RLS: hanya yang berizin baca audit)
    berperan(akses, "super_admin")
      ? supabase.from("audit_log").select("id, waktu, user_id, aksi, data_baru").eq("tabel", "pratinjau").order("waktu", { ascending: false }).limit(40)
      : Promise.resolve({ data: [] as { id: number; waktu: string; user_id: string | null; aksi: string; data_baru: Record<string, unknown> | null }[] }),
  ]);
  const idAdmin = [...new Set((riwayatPratinjau ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: namaAdmin } = idAdmin.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", idAdmin) : { data: [] };
  const siapa = (id: string | null) => {
    const n = (namaAdmin ?? []).find((x) => x.user_id === id);
    return n ? n.nama || n.email : "—";
  };
  // pasangkan mulai→selesai per admin (urut waktu); tanpa catatan selesai = berakhir otomatis ≤ 30 menit
  type SesiPratinjau = { siapa: string; peran: string; mulai: string; selesai: string | null; alasan: string };
  const sesiPratinjau = (() => {
    const urut = [...(riwayatPratinjau ?? [])].sort((a, b) => a.waktu.localeCompare(b.waktu));
    const terbuka = new Map<string, SesiPratinjau>();
    const hasil: SesiPratinjau[] = [];
    const kini = new Date().getTime();
    for (const r of urut) {
      const kunci = r.user_id ?? "";
      const peranNya = String(r.data_baru?.peran ?? "");
      if (r.aksi === "PRATINJAU_MULAI") {
        const lama = terbuka.get(kunci);
        if (lama) hasil.push({ ...lama, alasan: "berakhir otomatis (≤ 30 menit)" });
        terbuka.set(kunci, { siapa: siapa(r.user_id), peran: NAMA_PERAN[peranNya] ?? peranNya, mulai: r.waktu, selesai: null, alasan: "" });
      } else {
        const lama = terbuka.get(kunci);
        if (lama) {
          hasil.push({ ...lama, selesai: r.waktu, alasan: String(r.data_baru?.alasan ?? "") });
          terbuka.delete(kunci);
        }
      }
    }
    for (const t of terbuka.values()) hasil.push({ ...t, alasan: kini - Date.parse(t.mulai) > 30 * 60_000 ? "berakhir otomatis (≤ 30 menit)" : "sedang berlangsung" });
    return hasil.sort((a, b) => b.mulai.localeCompare(a.mulai)).slice(0, 20);
  })();
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
            Tombol “Keluar” hanya mengakhiri sesi di perangkat ini. Lupa keluar di komputer sekolah/warnet, HP hilang, atau curiga akun dipakai orang lain? Akhiri semua sesi, lalu ganti kata sandi.
          </p>
          <div className="mt-4">
            <TombolKeluarSemua />
          </div>
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

        {superAdmin && (
          <Kartu>
            <h2 id="riwayat-pratinjau" className="text-2xl">Riwayat &ldquo;Lihat sebagai…&rdquo;</h2>
            <p className="mt-1 text-sm text-black/60">
              Setiap mulai/selesai pratinjau peran dicatat: siapa, peran yang dilihat, dan waktunya. Mode ini hanya baca dan berakhir otomatis
              setelah 30 menit.{" "}
              <a href="/lihat-sebagai" className="font-semibold underline">
                Lihat sebagai…
              </a>
            </p>
            {sesiPratinjau.length === 0 ? (
              <p className="mt-4 text-sm text-black/50">Belum ada catatan.</p>
            ) : (
              <ul className="mt-4 divide-y divide-black/5 rounded-xl text-sm ring-1 ring-black/10" data-riwayat-pratinjau="">
                {sesiPratinjau.map((s, i) => (
                  <li key={i} className="px-4 py-2.5">
                    <p>
                      <strong>{s.siapa}</strong> melihat sebagai <strong>{s.peran}</strong>
                    </p>
                    <p className="text-xs text-black/55">
                      {waktuWIB(s.mulai)} → {s.selesai ? waktuWIB(s.selesai) : "—"}
                      {s.alasan && ` · ${s.alasan}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        )}
      </div>
    </>
  );
}
