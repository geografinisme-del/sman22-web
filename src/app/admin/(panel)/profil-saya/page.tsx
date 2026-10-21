import Link from "next/link";
import { JudulHalaman, Kartu, Lencana } from "@/components/admin/ui";
import { NAMA_PERAN, wajibLogin } from "@/lib/admin/auth";

export const metadata = { title: "Profil saya" };

/** Profil akun Guru & Tendik: nama, email, jabatan, peran, data kepegawaian tertaut. Perubahan lewat admin sekolah. */
export default async function ProfilSaya() {
  const { supabase, akses } = await wajibLogin();
  if (!akses) return null;
  const [{ data: saya, error }, { data: pid }] = await Promise.all([
    supabase.from("pengguna").select("nama, email, jabatan, jabatan_gtk(nama)").eq("user_id", akses.userId).maybeSingle(),
    supabase.rpc("pegawai_saya"),
  ]);
  const { data: peg } = pid ? await supabase.from("pegawai").select("nama, nip, nuptk, jenis, jabatan").eq("id", pid).maybeSingle() : { data: null };
  // sebelum migrasi 20261225 (kolom jabatan belum ada) → tampil tanpa jabatan akun
  const jabatan = error ? "" : ((saya?.jabatan_gtk as unknown as { nama: string } | null)?.nama ?? "");

  const baris: [string, React.ReactNode][] = [
    ["Nama", akses.nama || "—"],
    ["Email akun", akses.email],
    ["Jabatan", jabatan || peg?.jabatan || <span className="text-[var(--muted)]">Belum diisi admin</span>],
    [
      "Peran (hak akses)",
      akses.peran.length ? (
        akses.peran.map((p) => NAMA_PERAN[p] ?? p).join(", ")
      ) : (
        <span>
          Pegawai umum <Lencana warna="kuning">menunggu penetapan admin</Lencana>
        </span>
      ),
    ],
  ];
  if (peg) {
    baris.push(["Data kepegawaian", `${peg.nama} · ${peg.jenis === "guru" ? "Guru" : "Tenaga kependidikan"}`]);
    if (peg.nip) baris.push(["NIP", peg.nip]);
    if (peg.nuptk) baris.push(["NUPTK", peg.nuptk]);
  }

  return (
    <>
      <JudulHalaman judul="Profil saya" deskripsi="Data akun Anda di Portal Digital 22. Perubahan nama, jabatan, atau peran dilakukan oleh admin sekolah." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Kartu>
          <dl className="divide-y divide-[var(--line)]">
            {baris.map(([l, v]) => (
              <div key={l} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr]">
                <dt className="text-sm font-semibold text-[var(--muted)]">{l}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Kartu>
        <Kartu>
          <h2 className="text-xl">Keamanan akun</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Ganti kata sandi, aktifkan verifikasi dua langkah, atau keluar dari semua perangkat.</p>
          <Link href="/admin/keamanan" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white">
            Buka keamanan akun
          </Link>
          <p className="mt-6 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
            Data salah? Hubungi Tim TIK sekolah atau admin pengguna.{" "}
            <Link href="/admin/direktori" className="font-semibold text-[var(--ink)] underline underline-offset-2">
              Lihat direktori GTK
            </Link>
          </p>
        </Kartu>
      </div>
    </>
  );
}
