"use client";

import { useState, useTransition } from "react";
import { mulaiDaftarMfa, verifikasiMfa, type HasilDaftarMfa } from "@/app/admin/actions-keamanan";
import { FormAksi, TombolSimpan, useErrorKolom } from "@/components/admin/form";

/**
 * Satu kolom kode 6 angka: keyboard angka di HP, isi otomatis dari aplikasi (one-time-code),
 * tempel kode berspasi tetap diterima, angka 0 di depan tetap dipertahankan (disimpan sebagai teks).
 */
export function InputKode({ label = "Kode dari aplikasi autentikator", fokus = true }: { label?: string; fokus?: boolean }) {
  const error = useErrorKolom("kode");
  const [nilai, setNilai] = useState("");
  return (
    <div>
      <label htmlFor="kode" className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id="kode"
        name="kode"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus={fokus}
        value={nilai}
        onChange={(e) => setNilai(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onPaste={(e) => {
          e.preventDefault();
          setNilai(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "kode-error" : "kode-bantuan"}
        className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 font-mono text-2xl tracking-[0.3em] tabular-nums outline-none focus:border-[var(--tema-utama)] focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--tema-utama)_20%,transparent)] aria-[invalid=true]:border-blue-teks"
      />
      {error ? (
        <p id="kode-error" role="alert" className="mt-1.5 text-sm font-medium text-blue-teks">
          {error}
        </p>
      ) : (
        <p id="kode-bantuan" className="mt-1.5 text-sm text-[var(--muted)]">
          6 angka; kode berganti setiap 30 detik.
        </p>
      )}
    </div>
  );
}

/** Masuk dengan kode dari aplikasi autentikator yang sudah terdaftar */
export function FormTantangan({ faktor, lanjut = "/admin" }: { faktor: { id: string; nama: string }[]; lanjut?: string }) {
  const [pilih, setPilih] = useState(faktor[0]?.id ?? "");
  return (
    <FormAksi aksi={verifikasiMfa} className="mt-6 space-y-5">
      <input type="hidden" name="factor_id" value={pilih} />
      <input type="hidden" name="lanjut" value={lanjut} />
      {faktor.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold">Aplikasi</span>
          <select value={pilih} onChange={(e) => setPilih(e.target.value)} className="w-full rounded-lg border border-black/20 bg-white px-4 py-3">
            {faktor.map((f) => <option key={f.id} value={f.id}>{f.nama}</option>)}
          </select>
        </label>
      )}
      <InputKode />
      <TombolSimpan teksProses="Memverifikasi…">Verifikasi</TombolSimpan>
    </FormAksi>
  );
}

/** Daftarkan aplikasi autentikator baru (Google Authenticator, Microsoft Authenticator, Authy, dll.) */
export function DaftarMfa({ lanjut = "/admin", teksTombol = "Mulai pasang aplikasi autentikator" }: { lanjut?: string; teksTombol?: string }) {
  const [data, setData] = useState<HasilDaftarMfa | null>(null);
  const [lihatKunci, setLihatKunci] = useState(false);
  const [proses, mulai] = useTransition();

  if (!data?.ok)
    return (
      <div className="mt-6">
        {data && !data.ok && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{data.pesan}</p>}
        <button
          type="button"
          disabled={proses}
          onClick={() => mulai(async () => setData(await mulaiDaftarMfa()))}
          className="min-h-12 w-full rounded-lg bg-[var(--tema-utama)] px-6 py-3 font-semibold text-white hover:bg-[color-mix(in_srgb,var(--tema-utama)_86%,#000)] disabled:opacity-60"
        >
          {proses ? "Menyiapkan…" : teksTombol}
        </button>
      </div>
    );

  return (
    <div className="mt-6 space-y-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-black/70">
        <li>Buka aplikasi autentikator di HP (mis. Google Authenticator atau Microsoft Authenticator).</li>
        <li>Pilih <strong>tambah akun → pindai kode QR</strong>, arahkan ke gambar di bawah.</li>
        <li>Masukkan kode 6 angka yang muncul di aplikasi.</li>
      </ol>
      <div className="flex justify-center rounded-2xl bg-white p-4 ring-1 ring-black/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.qr} alt="Kode QR untuk aplikasi autentikator" width={200} height={200} className="h-[200px] w-[200px]" />
      </div>
      <div className="text-sm">
        <button type="button" onClick={() => setLihatKunci((v) => !v)} className="font-semibold text-blue-teks underline underline-offset-2">
          {lihatKunci ? "Sembunyikan kunci" : "Tidak bisa memindai? Ketik kunci manual"}
        </button>
        {lihatKunci && <p className="mt-2 break-all rounded-xl bg-black/5 p-3 font-mono text-sm tracking-wider">{data.rahasia}</p>}
      </div>
      <FormAksi aksi={verifikasiMfa} className="space-y-5">
        <input type="hidden" name="factor_id" value={data.factorId} />
        <input type="hidden" name="baru" value="1" />
        <input type="hidden" name="lanjut" value={lanjut} />
        <InputKode />
        <TombolSimpan teksProses="Memverifikasi…">Aktifkan</TombolSimpan>
      </FormAksi>
    </div>
  );
}
