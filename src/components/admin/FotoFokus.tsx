"use client";

import { useEffect, useState } from "react";
import { useErrorKolom } from "@/components/admin/form";

/**
 * Unggah foto + titik fokus dengan pratinjau langsung dua potongan: panel desktop (tegak) dan pita HP (±180px).
 * Mengirim kolom `foto` (file), `fokus_x`, `fokus_y` (0–100).
 */
export function FotoFokus({ sekarang, x = 50, y = 50 }: { sekarang: string; x?: number; y?: number }) {
  const [src, setSrc] = useState(sekarang);
  const [fx, setFx] = useState(x);
  const [fy, setFy] = useState(y);
  const [peringatan, setPeringatan] = useState<string | null>(null);
  const error = useErrorKolom("foto") ?? peringatan;
  useEffect(() => () => void (src.startsWith("blob:") && URL.revokeObjectURL(src)), [src]);
  const posisi = `${fx}% ${fy}%`;

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="foto" className="mb-1.5 block text-sm font-semibold">
          Foto baru (opsional)
        </label>
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={Boolean(error)}
          aria-describedby="foto-bantuan"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPeringatan(null);
            if (!f) return setSrc(sekarang);
            if (f.size > 4 * 1024 * 1024) {
              setPeringatan("Ukuran foto lebih dari 4 MB. Kecilkan dulu sebelum diunggah.");
              e.target.value = "";
              return setSrc(sekarang);
            }
            setSrc(URL.createObjectURL(f));
          }}
          className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink/85"
        />
        <p id="foto-bantuan" className="mt-1 text-sm text-[var(--muted)]">
          JPG, PNG, atau WEBP, maksimal 4 MB. Disarankan foto mendatar minimal 1600 px. Bukan gambar buatan AI.
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          Titik fokus horizontal: {fx}
          <input type="range" name="fokus_x" min={0} max={100} value={fx} onChange={(e) => setFx(Number(e.target.value))} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Titik fokus vertikal: {fy}
          <input type="range" name="fokus_y" min={0} max={100} value={fy} onChange={(e) => setFy(Number(e.target.value))} />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-4" aria-label="Pratinjau potongan foto">
        <figure className="grid gap-1 text-xs text-[var(--muted)]">
          <span className="block h-48 w-36 overflow-hidden rounded-2xl bg-[var(--soft)] ring-1 ring-[var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: posisi }} />}
          </span>
          <figcaption>Panel desktop</figcaption>
        </figure>
        <figure className="grid gap-1 text-xs text-[var(--muted)]">
          <span className="block h-[72px] w-40 overflow-hidden rounded-lg bg-[var(--soft)] ring-1 ring-[var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: posisi }} />}
          </span>
          <figcaption>Pita HP</figcaption>
        </figure>
        <figure className="grid gap-1 text-xs text-[var(--muted)]">
          <span className="block h-24 w-32 overflow-hidden rounded-xl bg-[var(--soft)] ring-1 ring-[var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: posisi }} />}
          </span>
          <figcaption>Kartu &ldquo;Pilih pintu&rdquo;</figcaption>
        </figure>
      </div>
    </div>
  );
}
