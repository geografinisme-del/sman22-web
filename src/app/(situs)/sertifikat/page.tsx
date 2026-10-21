import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { JENIS_SERTIF } from "@/lib/ekskul";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseAnonSegar } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Verifikasi Sertifikat", robots: { index: false } };
export const dynamic = "force-dynamic";
type V = { kode: string; nama_samaran: string; organisasi: string; jenis: string; judul: string; keterangan: string; tanggal: string; berlaku: boolean };

export default async function VerifikasiSertifikat({ searchParams }: { searchParams: Promise<{ kode?: string }> }) {
  const kode = ((await searchParams).kode ?? "").trim().toUpperCase().slice(0, 20);
  const valid = /^S22-[A-Z0-9]{8}$/.test(kode);
  const { data } = valid && supabaseAktif ? await supabaseAnonSegar().rpc("verifikasi_sertifikat", { p_kode: kode }) : { data: [] };
  const v = ((data ?? []) as V[])[0];
  return (
    <>
      <PageHeader judul="Verifikasi Sertifikat" deskripsi="Cek keaslian sertifikat ekstrakurikuler & organisasi siswa SMAN 22 Bandung." />
      <Section>
        <div className="max-w-2xl space-y-6">
          <form className="flex gap-2" role="search">
            <input name="kode" defaultValue={kode} placeholder="S22-XXXXXXXX" aria-label="Kode sertifikat" className="flex-1 rounded-lg border border-black/15 bg-white px-5 py-3 font-mono" />
            <button className="rounded-full bg-ink px-6 py-3 font-semibold text-white transition-colors hover:bg-ink/85">Periksa</button>
          </form>
          {kode && (v ? (
            <div role="status" className={`rounded-2xl p-6 ring-1 ${v.berlaku ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
              <p className="text-2xl">{v.berlaku ? "✓ Sertifikat asli" : "✗ Sertifikat sudah dicabut"}</p>
              <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1 text-sm">
                <dt className="text-[var(--muted)]">Atas nama</dt><dd>{v.nama_samaran}</dd>
                <dt className="text-[var(--muted)]">Organisasi</dt><dd>{v.organisasi}</dd>
                <dt className="text-[var(--muted)]">Jenis</dt><dd>{JENIS_SERTIF[v.jenis]}</dd>
                <dt className="text-[var(--muted)]">Judul</dt><dd>{v.judul}</dd>
                <dt className="text-[var(--muted)]">Tanggal</dt><dd>{new Date(v.tanggal + "T00:00:00Z").toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" })}</dd>
              </dl>
              <p className="mt-3 text-xs text-[var(--muted)]">Nama disamarkan untuk melindungi data siswa — cocokkan huruf awal dengan nama pada dokumen.</p>
            </div>
          ) : <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Kode tidak ditemukan. Periksa kembali penulisannya.</p>)}
        </div>
      </Section>
    </>
  );
}
