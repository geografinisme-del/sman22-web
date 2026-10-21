"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { jawabKuis, mulaiKuis } from "@/app/admin/actions-lms";

type Soal = { id: string; pertanyaan: string; pilihan: string[]; jawaban: number | null };

/** Siswa mengerjakan kuis: pewaktu, simpan otomatis, kirim. Penilaian dilakukan di server. */
export function KerjakanKuis({ kuisId, durasi }: { kuisId: string; durasi: number }) {
  const router = useRouter();
  const [soal, setSoal] = useState<Soal[] | null>(null);
  const [jawab, setJawab] = useState<Record<string, number>>({});
  const [batas, setBatas] = useState<number>(0);
  const [sisa, setSisa] = useState(0);
  const [pesan, setPesan] = useState("");
  const [tersimpan, setTersimpan] = useState("");
  const [proses, mulai] = useTransition();
  const kirimRef = useRef(false);
  const jawabRef = useRef(jawab);
  useEffect(() => { jawabRef.current = jawab; }, [jawab]);

  const kirim = useCallback((selesai: boolean) => {
    if (selesai) { if (kirimRef.current) return; kirimRef.current = true; }
    mulai(async () => {
      const r = await jawabKuis(kuisId, jawabRef.current, selesai);
      if (!r.ok) { setPesan(r.pesan); kirimRef.current = false; return; }
      if (selesai) router.refresh();
      else setTersimpan(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    });
  }, [kuisId, router]);

  // pewaktu: kirim otomatis saat habis
  useEffect(() => {
    if (!batas) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((batas - Date.now()) / 1000));
      setSisa(s);
      if (s === 0) kirim(true);
    }, 1000);
    return () => clearInterval(t);
  }, [batas, kirim]);
  // simpan otomatis tiap 20 detik
  useEffect(() => {
    if (!soal) return;
    const t = setInterval(() => kirim(false), 20000);
    return () => clearInterval(t);
  }, [soal, kirim]);

  if (!soal)
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <p className="text-black/70">Waktu mengerjakan <strong>{durasi} menit</strong> sejak tombol ditekan dan tidak bisa dijeda. Jawaban tersimpan otomatis; kuis terkirim sendiri saat waktu habis.</p>
        {pesan && <p role="alert" className="mt-3 text-sm text-blue-teks">{pesan}</p>}
        <button type="button" disabled={proses} onClick={() => mulai(async () => {
          const r = await mulaiKuis(kuisId);
          if (!r.ok) return setPesan(r.pesan);
          if (r.selesai) return router.refresh();
          setSoal(r.soal);
          setJawab(Object.fromEntries(r.soal.filter((s) => s.jawaban != null).map((s) => [s.id, s.jawaban!])));
          setBatas(new Date(r.batas).getTime());
        })} className="mt-4 rounded-full bg-ink px-6 py-3 font-semibold text-white disabled:opacity-60">{proses ? "Menyiapkan…" : "Mulai mengerjakan"}</button>
      </div>
    );

  const terjawab = Object.keys(jawab).length;
  const mm = String(Math.floor(sisa / 60)).padStart(2, "0"), ss = String(sisa % 60).padStart(2, "0");
  return (
    <div className="space-y-4 pb-24">
      <div className="sticky top-0 z-10 -mx-5 flex items-center gap-3 bg-soft/95 px-5 py-3 backdrop-blur">
        <span className={`font-mono text-2xl tabular-nums ${sisa <= 60 ? "text-blue-teks" : ""}`} aria-live="polite">{mm}:{ss}</span>
        <span className="flex-1 text-sm text-black/60">{terjawab}/{soal.length} terjawab{tersimpan && ` · tersimpan ${tersimpan}`}</span>
      </div>
      {pesan && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{pesan}</p>}
      <ol className="space-y-4">
        {soal.map((s, i) => (
          <li key={s.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <p className="mb-3 font-medium">{i + 1}. {s.pertanyaan}</p>
            <div className="space-y-2" role="radiogroup" aria-label={`Soal ${i + 1}`}>
              {s.pilihan.map((p, j) => (
                <label key={j} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-black/10 has-[:checked]:bg-soft has-[:checked]:ring-muted">
                  <input type="radio" name={s.id} checked={jawab[s.id] === j} onChange={() => setJawab((x) => ({ ...x, [s.id]: j }))} className="mt-1" />
                  <span><strong>{String.fromCharCode(65 + j)}.</strong> {p}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="fixed inset-x-0 bottom-0 bg-white/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="flex-1 text-sm text-black/60">{terjawab < soal.length ? `${soal.length - terjawab} soal belum dijawab` : "Semua soal terjawab"}</span>
          <button type="button" disabled={proses} onClick={() => { if (terjawab === soal.length || confirm("Masih ada soal kosong. Kirim sekarang?")) kirim(true); }}
            className="rounded-full bg-ink px-6 py-3 font-semibold text-white disabled:opacity-60">Kirim jawaban</button>
        </div>
      </div>
    </div>
  );
}
