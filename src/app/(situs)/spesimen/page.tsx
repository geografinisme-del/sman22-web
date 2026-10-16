import { notFound } from "next/navigation";

export const metadata = { title: "Spesimen desain", robots: { index: false, follow: false } };

const WARNA = [
  ["--color-brand", "Marun merek (hue logo)", "#7a1f36", "Judul aksen, tombol utama, footer"],
  ["--color-paper", "Kertas", "#f5f0e6", "Latar halaman"],
  ["--color-ink", "Tinta", "#1c1a17", "Teks utama"],
  ["--color-ink-muted", "Tinta pudar", "#5b554c", "Keterangan, metadata"],
  ["--color-accent", "Emas", "#b8892b", "Sangat jarang; dekoratif saja (bukan teks)"],
  ["--color-rule", "Garis", "#d9d0bf", "Pemisah 1px"],
] as const;

/** Spesimen DESIGN TOKENS (Tahap 1). Hanya di lingkungan pengembangan; 404 di produksi. */
export default function Spesimen() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="lp-wadah py-14">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">Tahap 1 · design tokens</p>
      <h1 className="mt-3" style={{ fontSize: "var(--text-hero)", lineHeight: 1.02 }}>
        SMA Negeri 22 Bandung
      </h1>
      <p className="mt-4 text-[var(--color-ink-muted)]">
        Hero — Newsreader 600, 72px desktop / 40px ponsel. <em className="font-serif italic">Italic hanya untuk aksen sesekali.</em>
      </p>

      <div className="mt-12 grid gap-10 border-t border-[var(--color-rule)] pt-10 lg:grid-cols-2">
        <section>
          <h2>Kabar dari Sekolah</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">h2 — Newsreader 600, 40px / 30px</p>
          <h3 className="mt-6">Judul berita kecil — Newsreader 600, 20px</h3>
          <p className="mt-3">
            Teks isi memakai Plus Jakarta Sans 400 berukuran 18px dengan jarak baris 1,6. Lebar paragraf dibatasi sekitar 65 karakter agar nyaman dibaca, seperti kolom pada buku
            tahunan atau koran sekolah. <strong>Tebal 700</strong> untuk penekanan, <span className="font-medium">500</span> untuk menu.
          </p>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-brand)]">Label kategori · huruf kecil kapital</p>
        </section>
        <section>
          <h2>Warna (nama berdasarkan peran)</h2>
          <ul className="mt-4 border-t border-[var(--color-rule)]">
            {WARNA.map(([v, nama, hex, guna]) => (
              <li key={v} className="grid grid-cols-[44px_1fr] items-center gap-4 border-b border-[var(--color-rule)] py-3">
                <span aria-hidden className="h-11 w-11 border border-[var(--color-rule)]" style={{ background: `var(${v})`, borderRadius: "var(--radius-1)" }} />
                <span>
                  <span className="block font-bold">
                    {nama} <code className="text-sm font-normal text-[var(--color-ink-muted)]">{v} {hex}</code>
                  </span>
                  <span className="block text-sm text-[var(--color-ink-muted)]">{guna}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-12 grid gap-6 border-t border-[var(--color-rule)] pt-10 sm:grid-cols-3">
        <div>
          <h3>Sudut 0–4px</h3>
          <div className="mt-3 flex gap-3">
            {["--radius-0", "--radius-1", "--radius-2"].map((r) => (
              <span key={r} className="grid h-16 w-16 place-items-end bg-[var(--color-brand)] p-1 text-[11px] text-[var(--color-paper)]" style={{ borderRadius: `var(${r})` }}>
                {r.slice(-1)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Pemisah</h3>
          <p className="mt-3 border-y border-[var(--color-rule)] py-3 text-sm text-[var(--color-ink-muted)]">Garis 1px --color-rule, tanpa bayangan.</p>
        </div>
        <div>
          <h3>Tombol</h3>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <a href="#" className="inline-flex min-h-11 items-center bg-[var(--color-brand)] px-5 font-bold text-white" style={{ borderRadius: "var(--radius-1)" }}>
              Informasi SPMB
            </a>
            <a href="#" className="font-bold text-[var(--color-brand)] underline underline-offset-4">
              Kenali sekolah →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
