"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { aiBuatSlide } from "@/app/admin/actions-ai";
import { simpanMateri } from "@/app/admin/actions-kurikulum";
import { FormAksi, TombolSimpan } from "@/components/admin/form";
import type { Slide } from "@/lib/kurikulum";
import { TampilSlide } from "./Slide";

const JENIS = { isi: "Teks/poin", gambar: "Gambar", video: "Video YouTube", soal: "Soal pilihan ganda" } as const;
const baru = (j: keyof typeof JENIS): Slide =>
  j === "isi" ? { jenis: "isi", judul: "", isi: "" }
  : j === "gambar" ? { jenis: "gambar", judul: "", url: "", isi: "" }
  : j === "video" ? { jenis: "video", judul: "", url: "" }
  : { jenis: "soal", judul: "Cek pemahaman", pertanyaan: "", pilihan: ["", "", "", ""], kunci: 0, pembahasan: "" };
const inp = "w-full rounded-xl border border-black/15 bg-white px-3 py-2";

export function EditorMateri({ materi, kelas, aiAktif }: {
  materi: { id: string; judul: string; ringkasan: string; slide: Slide[]; terbit: boolean; kelas: string[] };
  kelas: { id: string; nama: string }[];
  aiAktif: boolean;
}) {
  const [slide, setSlide] = useState<Slide[]>(materi.slide);
  const [aktif, setAktif] = useState(0);
  const [topik, setTopik] = useState("");
  const [jumlah, setJumlah] = useState(6);
  const [soal, setSoal] = useState(2);
  const [pesanAi, setPesanAi] = useState("");
  const [proses, mulai] = useTransition();
  const s = slide[aktif];
  const ubah = (patch: Partial<Slide>) => setSlide((l) => l.map((x, i) => (i === aktif ? ({ ...x, ...patch } as Slide) : x)));
  const pindah = (d: number) => setSlide((l) => {
    const j = aktif + d;
    if (j < 0 || j >= l.length) return l;
    const n = [...l];
    [n[aktif], n[j]] = [n[j], n[aktif]];
    setAktif(j);
    return n;
  });

  return (
    <FormAksi aksi={simpanMateri} className="space-y-6">
      <input type="hidden" name="id" value={materi.id} />
      <input type="hidden" name="slide" value={JSON.stringify(slide)} />
      <div className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 lg:grid-cols-[1fr_1fr]">
        <label className="text-sm font-semibold">Judul materi<input name="judul" defaultValue={materi.judul} maxLength={150} className={`${inp} mt-1.5 font-normal`} /></label>
        <label className="text-sm font-semibold">Ringkasan (tampil di portal siswa)<input name="ringkasan" defaultValue={materi.ringkasan} maxLength={500} className={`${inp} mt-1.5 font-normal`} /></label>
        <fieldset className="lg:col-span-2">
          <legend className="mb-1.5 text-sm font-semibold">Kelas yang menerima</legend>
          {kelas.length === 0 ? <p className="text-sm text-black/50">Anda belum mengajar mapel ini di kelas mana pun.</p> : (
            <div className="flex flex-wrap gap-3">
              {kelas.map((k) => (
                <label key={k.id} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10 has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-600">
                  <input type="checkbox" name="kelas" value={k.id} defaultChecked={materi.kelas.includes(k.id)} /> {k.nama}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="terbit" defaultChecked={materi.terbit} className="h-5 w-5 accent-brand-800" /> Terbitkan ke portal siswa kelas terpilih
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link href={`/papan/${materi.id}`} target="_blank" className="rounded-full bg-accent-400 px-5 py-3 font-semibold text-brand-900">▶ Tayangkan di papan</Link>
          <TombolSimpan>Simpan materi</TombolSimpan>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          <ol className="space-y-1.5">
            {slide.map((x, i) => (
              <li key={i}>
                <button type="button" onClick={() => setAktif(i)} className={`w-full truncate rounded-xl px-3 py-2 text-left text-sm ${i === aktif ? "bg-brand-900 text-white" : "bg-white ring-1 ring-black/10"}`}>
                  {i + 1}. {x.judul || (x.jenis === "soal" ? x.pertanyaan : JENIS[x.jenis]) || "(kosong)"}
                </button>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {(Object.keys(JENIS) as (keyof typeof JENIS)[]).map((j) => (
              <button key={j} type="button" disabled={slide.length >= 60} onClick={() => { setSlide((l) => [...l.slice(0, aktif + 1), baru(j), ...l.slice(aktif + 1)]); setAktif(aktif + 1); }}
                className="rounded-lg px-2 py-1.5 font-semibold ring-1 ring-black/15 hover:bg-black/5">+ {JENIS[j]}</button>
            ))}
          </div>
        </aside>

        <div className="grid gap-6 2xl:grid-cols-2">
          {s ? (
            <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-black/5 px-2.5 py-1 font-semibold">Slide {aktif + 1} · {JENIS[s.jenis]}</span>
                <span className="flex-1" />
                <button type="button" onClick={() => pindah(-1)} className="rounded-full px-2.5 py-1 ring-1 ring-black/15" aria-label="Naikkan">↑</button>
                <button type="button" onClick={() => pindah(1)} className="rounded-full px-2.5 py-1 ring-1 ring-black/15" aria-label="Turunkan">↓</button>
                <button type="button" disabled={slide.length <= 1} onClick={() => { setSlide((l) => l.filter((_, i) => i !== aktif)); setAktif(Math.max(0, aktif - 1)); }} className="rounded-full px-2.5 py-1 text-merah ring-1 ring-merah/30">Hapus</button>
              </div>
              <label className="block text-sm font-semibold">Judul<input value={s.judul} onChange={(e) => ubah({ judul: e.target.value })} maxLength={150} className={`${inp} mt-1 font-normal`} /></label>
              {(s.jenis === "gambar" || s.jenis === "video") && (
                <label className="block text-sm font-semibold">{s.jenis === "gambar" ? "Alamat gambar (https://…)" : "Tautan YouTube"}
                  <input value={s.url} onChange={(e) => ubah({ url: e.target.value })} maxLength={500} className={`${inp} mt-1 font-normal`} placeholder="https://" /></label>
              )}
              {(s.jenis === "isi" || s.jenis === "gambar") && (
                <label className="block text-sm font-semibold">Isi <span className="font-normal text-black/50">(awali baris dengan “- ” untuk poin)</span>
                  <textarea value={s.isi} onChange={(e) => ubah({ isi: e.target.value })} rows={8} maxLength={3000} className={`${inp} mt-1 font-normal`} /></label>
              )}
              {s.jenis === "soal" && (
                <>
                  <label className="block text-sm font-semibold">Pertanyaan<textarea value={s.pertanyaan} onChange={(e) => ubah({ pertanyaan: e.target.value })} rows={3} maxLength={1000} className={`${inp} mt-1 font-normal`} /></label>
                  <fieldset className="space-y-1.5 text-sm">
                    <legend className="mb-1 font-semibold">Pilihan (tandai kunci jawaban)</legend>
                    {s.pilihan.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="radio" name={`kunci-${aktif}`} checked={s.kunci === i} onChange={() => ubah({ kunci: i })} aria-label={`Kunci ${String.fromCharCode(65 + i)}`} />
                        <span className="w-5 font-bold">{String.fromCharCode(65 + i)}</span>
                        <input value={p} onChange={(e) => ubah({ pilihan: s.pilihan.map((x, j) => (j === i ? e.target.value : x)) })} maxLength={300} className={inp} />
                      </div>
                    ))}
                  </fieldset>
                  <label className="block text-sm font-semibold">Pembahasan<textarea value={s.pembahasan} onChange={(e) => ubah({ pembahasan: e.target.value })} rows={2} maxLength={1000} className={`${inp} mt-1 font-normal`} /></label>
                </>
              )}
            </div>
          ) : <p className="text-sm text-black/50">Tambahkan slide.</p>}
          {s && (
            <div className="min-h-64 rounded-2xl bg-white p-6 ring-1 ring-black/5">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-black/40">Pratinjau</p>
              <TampilSlide key={aktif + s.jenis} s={s} />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-violet-50 p-5 ring-1 ring-violet-200">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-2xl">Buat slide dengan AI <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-800">AI</span></h2>
        {aiAktif ? (
          <>
            <p className="mb-3 text-sm text-black/60">Tulis topik atau tujuan pembelajaran. Slide hasil AI ditambahkan di akhir — periksa & sunting sebelum ditayangkan.</p>
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="min-w-64 flex-1">Topik / TP<textarea value={topik} onChange={(e) => setTopik(e.target.value)} rows={2} maxLength={1000} className={`${inp} mt-1`} placeholder="mis. Peserta didik menganalisis penyebab gempa bumi dan mitigasinya di Jawa Barat" /></label>
              <label>Slide<br /><input type="number" min={3} max={15} value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} className={`${inp} w-20`} /></label>
              <label>Soal<br /><input type="number" min={0} max={10} value={soal} onChange={(e) => setSoal(Number(e.target.value))} className={`${inp} w-20`} /></label>
              <button type="button" disabled={proses} onClick={() => mulai(async () => {
                setPesanAi("");
                const r = await aiBuatSlide({ materi_id: materi.id, topik, jumlah, soal });
                if (!r.ok) return setPesanAi(r.pesan);
                setSlide((l) => [...l, ...r.data].slice(0, 60));
                setAktif(slide.length);
                setPesanAi(`${r.data.length} slide ditambahkan (belum disimpan). Sisa kuota AI hari ini: ${r.sisa}.`);
              })} className="rounded-full bg-violet-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
                {proses ? "AI sedang membuat… (±20 detik)" : "Buat slide"}
              </button>
            </div>
            {pesanAi && <p role="status" className="mt-2 text-sm">{pesanAi}</p>}
          </>
        ) : <p className="text-sm text-black/60">Belum diaktifkan sekolah (ANTHROPIC_API_KEY).</p>}
      </div>
    </FormAksi>
  );
}
