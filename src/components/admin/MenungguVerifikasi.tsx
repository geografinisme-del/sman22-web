import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfil } from "@/lib/data";

/**
 * Akun aktif TANPA peran: belum diverifikasi admin. Hanya melihat profilnya sendiri + kontak operator.
 * Data internal (pengumuman internal, kalender pegawai, direktori) juga ditolak database (staf_aktif = false).
 * Dasbor dasar Guru & Tendik aktif setelah admin memberi peran (minimal "Pegawai umum").
 */
export async function MenungguVerifikasi({ supabase, nama, email, keluar }: { supabase: SupabaseClient; nama: string; email: string; keluar: () => Promise<void> }) {
  const [{ data: saya }, profil] = await Promise.all([
    // RLS: pengguna hanya bisa membaca barisnya sendiri; kolom jabatan ada setelah migrasi 20261225
    supabase.from("pengguna").select("*").maybeSingle<{ nama: string; jabatan?: string | null; created_at?: string }>(),
    getProfil(),
  ]);
  const baris: [string, string][] = [
    ["Nama", saya?.nama || nama || "—"],
    ["Email akun", email],
    ["Status", "Menunggu verifikasi admin"],
  ];
  const kontak = [
    profil.telepon && { label: "Telepon", isi: profil.telepon, href: `tel:${profil.telepon.replace(/[^\d+]/g, "")}` },
    profil.email && { label: "Email", isi: profil.email, href: `mailto:${profil.email}` },
  ].filter(Boolean) as { label: string; isi: string; href: string }[];

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--soft)] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-sm ring-1 ring-[var(--line)] sm:p-9">
        <p className="label-mono text-[var(--blue-teks)]">Portal Digital 22</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">Akun Anda menunggu verifikasi admin</h1>
        <p className="mt-3 text-[var(--muted)]">
          Anda sudah berhasil masuk, tetapi akun ini belum diberi peran. Setelah admin sekolah memverifikasi dan menetapkan peran
          Anda, dasbor Guru &amp; Tendik akan terbuka otomatis saat Anda masuk kembali. Admin sudah mendapat pemberitahuan.
        </p>

        <h2 className="mt-7 text-lg font-semibold">Profil saya</h2>
        <dl className="mt-2 divide-y divide-[var(--line)] rounded-2xl ring-1 ring-[var(--line)]">
          {baris.map(([l, v]) => (
            <div key={l} className="grid gap-1 px-4 py-3 sm:grid-cols-[130px_1fr]">
              <dt className="text-sm font-semibold text-[var(--muted)]">{l}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-7 text-lg font-semibold">Hubungi operator sekolah</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Untuk mempercepat verifikasi, hubungi operator/Tim TIK sekolah dan sebutkan email akun Anda.</p>
        {kontak.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {kontak.map((k) => (
              <li key={k.label}>
                <a href={k.href} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-4 ring-1 ring-[var(--line)] hover:bg-[var(--soft)]">
                  <span className="text-sm text-[var(--muted)]">{k.label}</span>
                  <span className="font-semibold">{k.isi}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">Datang ke ruang Tata Usaha pada jam layanan.</p>
        )}
        {profil.jamLayanan && <p className="mt-2 text-sm text-[var(--muted)]">Jam layanan: {profil.jamLayanan}</p>}

        <form data-keluar-akun="" action={keluar} className="mt-8">
          <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-6 font-semibold text-white">
            Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
