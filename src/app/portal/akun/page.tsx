import { konteksPortal } from "../data";
import { FormSandi } from "./FormSandi";

export const metadata = { title: "Akun" };

export default async function AkunPortal() {
  const { akses, anak, ortu } = await konteksPortal();
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <h1 className="text-3xl">Akun saya</h1>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-[var(--muted)]">Nama</dt><dd>{akses.nama}</dd>
          <dt className="text-[var(--muted)]">Jenis akun</dt><dd>{ortu ? "Orang tua / wali" : "Siswa"}</dd>
          <dt className="text-[var(--muted)]">{ortu ? "Anak" : "Kelas"}</dt>
          <dd>{ortu ? anak.map((a) => a.nama).join(", ") || "—" : anak[0]?.kelas ?? "—"}</dd>
        </dl>
        <p className="mt-3 text-xs text-[var(--muted)]">Data salah? Hubungi wali kelas atau tata usaha untuk perbaikan.</p>
      </section>
      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <h2 className="text-2xl">Ganti kata sandi</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Minimal 8 karakter, berisi huruf dan angka. Lupa kata sandi? Minta wali kelas/TU membuatkan yang baru.</p>
        <FormSandi />
      </section>
    </div>
  );
}
