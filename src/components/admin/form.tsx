"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { HasilAksi } from "@/app/admin/actions";

export const HASIL_AWAL: HasilAksi = { ok: false, pesan: "" };

const ProsesCtx = createContext(false);
const ErrorCtx = createContext<Record<string, string>>({});

/** Pakai error validasi dari server untuk kolom tertentu */
export function useErrorKolom(nama: string) {
  return useContext(ErrorCtx)[nama];
}

/**
 * Formulir admin. Isian TIDAK dikosongkan saat ada kesalahan,
 * sehingga pengguna cukup memperbaiki kolom yang ditandai.
 */
export function FormAksi({
  aksi,
  children,
  className = "space-y-6",
}: {
  aksi: (prev: HasilAksi, form: FormData) => Promise<HasilAksi>;
  children: ReactNode;
  className?: string;
}) {
  const [hasil, jalankan, proses] = useActionState(aksi, HASIL_AWAL);
  const [, mulai] = useTransition();
  return (
    <ProsesCtx.Provider value={proses}>
      <ErrorCtx.Provider value={hasil.errors ?? {}}>
        <form
          noValidate
          className={className}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
            mulai(() => jalankan(data));
          }}
        >
          <PesanHasil hasil={hasil} />
          {children}
        </form>
      </ErrorCtx.Provider>
    </ProsesCtx.Provider>
  );
}

const kelasInput =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 aria-[invalid=true]:border-merah";

export function Kolom({
  label,
  nama,
  error,
  bantuan,
  children,
}: {
  label: string;
  nama: string;
  error?: string;
  bantuan?: string;
  children: ReactNode;
}) {
  const errorServer = useErrorKolom(nama);
  error = error ?? errorServer;
  return (
    <div>
      <label htmlFor={nama} className="mb-1.5 block text-sm font-semibold text-tinta">
        {label}
      </label>
      {children}
      {bantuan && !error && <p className="mt-1.5 text-xs text-black/50">{bantuan}</p>}
      {error && (
        <p id={`${nama}-error`} className="mt-1.5 text-sm text-merah">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = {
  label: string;
  nama: string;
  nilai?: string | number;
  error?: string;
  bantuan?: string;
  tipe?: string;
  wajib?: boolean;
  placeholder?: string;
  maks?: number;
};

export function Input({ label, nama, nilai, error, bantuan, tipe = "text", wajib, placeholder, maks }: InputProps) {
  const errorServer = useErrorKolom(nama);
  error = error ?? errorServer;
  return (
    <Kolom label={label} nama={nama} error={error} bantuan={bantuan}>
      <input
        id={nama}
        name={nama}
        type={tipe}
        defaultValue={nilai}
        required={wajib}
        placeholder={placeholder}
        maxLength={maks}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${nama}-error` : undefined}
        className={kelasInput}
      />
    </Kolom>
  );
}

export function TextArea({ label, nama, nilai, error, bantuan, baris = 4, wajib, placeholder, maks }: InputProps & { baris?: number }) {
  const errorServer = useErrorKolom(nama);
  error = error ?? errorServer;
  return (
    <Kolom label={label} nama={nama} error={error} bantuan={bantuan}>
      <textarea
        id={nama}
        name={nama}
        defaultValue={nilai}
        rows={baris}
        required={wajib}
        placeholder={placeholder}
        maxLength={maks}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${nama}-error` : undefined}
        className={`${kelasInput} leading-relaxed`}
      />
    </Kolom>
  );
}

export function Pilihan({
  label,
  nama,
  nilai,
  opsi,
  error,
}: {
  label: string;
  nama: string;
  nilai?: string;
  opsi: { nilai: string; label: string }[];
  error?: string;
}) {
  return (
    <Kolom label={label} nama={nama} error={error}>
      <select id={nama} name={nama} defaultValue={nilai} className={kelasInput}>
        {opsi.map((o) => (
          <option key={o.nilai} value={o.nilai}>
            {o.label}
          </option>
        ))}
      </select>
    </Kolom>
  );
}

export function Centang({ label, nama, nilai, bantuan }: { label: string; nama: string; nilai?: boolean; bantuan?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white p-4">
      <input type="checkbox" name={nama} defaultChecked={nilai} className="mt-1 h-5 w-5 accent-brand-800" />
      <span>
        <span className="block font-semibold">{label}</span>
        {bantuan && <span className="block text-sm text-black/50">{bantuan}</span>}
      </span>
    </label>
  );
}

/** Pilih foto + pratinjau sebelum diunggah */
export function InputGambar({
  label,
  nama,
  sekarang,
  error,
  wajib,
}: {
  label: string;
  nama: string;
  sekarang?: string;
  error?: string;
  wajib?: boolean;
}) {
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [peringatan, setPeringatan] = useState<string | null>(null);
  useEffect(() => () => void (pratinjau && URL.revokeObjectURL(pratinjau)), [pratinjau]);
  const tampil = pratinjau ?? sekarang;

  return (
    <Kolom label={label} nama={nama} error={error ?? peringatan ?? undefined} bantuan="JPG, PNG, atau WEBP. Maksimal 4 MB.">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-32 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-krem-tua sm:w-48">
          {tampil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tampil} alt="Pratinjau foto" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-black/40">Belum ada foto</span>
          )}
        </div>
        <input
          id={nama}
          name={nama}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={wajib}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPeringatan(null);
            if (!f) return setPratinjau(null);
            if (f.size > 4 * 1024 * 1024) {
              setPeringatan("Ukuran foto lebih dari 4 MB. Kecilkan dulu sebelum diunggah.");
              e.target.value = "";
              return setPratinjau(null);
            }
            setPratinjau(URL.createObjectURL(f));
          }}
          className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
      </div>
    </Kolom>
  );
}

export function TombolSimpan({ children = "Simpan" }: { children?: ReactNode }) {
  const pending = useContext(ProsesCtx);
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-6 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
    >
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />}
      {pending ? "Menyimpan…" : children}
    </button>
  );
}

export function PesanHasil({ hasil }: { hasil: HasilAksi }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hasil.pesan) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasil]);
  if (!hasil.pesan) return null;
  return (
    <div
      ref={ref}
      role={hasil.ok ? "status" : "alert"}
      className={`whitespace-pre-line rounded-xl px-4 py-3 text-sm font-medium ${
        hasil.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"
      }`}
    >
      {hasil.pesan}
    </div>
  );
}

/** Tombol arsipkan dengan konfirmasi */
export function TombolArsip({ judul }: { judul: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(`Arsipkan "${judul}"? Data tidak tampil lagi di situs, tetapi tetap tersimpan di database.`)) e.preventDefault();
      }}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-merah hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Mengarsipkan…" : "Arsipkan"}
    </button>
  );
}

/** Unggah bukti (foto atau PDF), opsional */
export function InputBukti({ label = "Bukti (opsional)", nama = "bukti", bantuan = "Foto surat/dokumen atau PDF, maksimal 4 MB." }: { label?: string; nama?: string; bantuan?: string }) {
  const error = useErrorKolom(nama);
  return (
    <Kolom label={label} nama={nama} error={error} bantuan={bantuan}>
      <input
        id={nama}
        name={nama}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
      />
    </Kolom>
  );
}

/** Kirim formulir ke aksi server tanpa mengosongkan isian (React mengosongkan formulir yang memakai prop action) */
export function useKirim(jalankan: (f: FormData) => void) {
  const [, mulai] = useTransition();
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    mulai(() => jalankan(data));
  };
}
