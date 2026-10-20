"use client";

import { useState } from "react";
import type { Slide } from "@/lib/kurikulum";
import { TampilSlide } from "./Slide";

/** Penampil materi untuk siswa (HP/laptop): satu slide per layar */
export function PemutarMateri({ slide }: { slide: Slide[] }) {
  const [i, setI] = useState(0);
  if (!slide.length) return <p className="text-black/50">Materi belum berisi slide.</p>;
  return (
    <div className="space-y-4">
      <div className="min-h-72 rounded-2xl bg-white p-6 ring-1 ring-black/5"><TampilSlide key={i} s={slide[i]} /></div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="rounded-full px-5 py-2.5 font-semibold ring-1 ring-black/15 disabled:opacity-40">← Sebelumnya</button>
        <span className="flex-1 text-center text-sm tabular-nums text-black/60">{i + 1} / {slide.length}</span>
        <button type="button" onClick={() => setI((x) => Math.min(slide.length - 1, x + 1))} disabled={i >= slide.length - 1} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white disabled:opacity-40">Berikutnya →</button>
      </div>
    </div>
  );
}
