"use client";

import { useState } from "react";
import { idYoutube, type Slide } from "@/lib/kurikulum";

/** Teks slide: baris "- " menjadi poin, baris lain paragraf */
function TeksSlide({ teks, besar }: { teks: string; besar?: boolean }) {
  const baris = teks.split("\n").map((b) => b.trimEnd()).filter((b) => b.trim());
  const blok: ({ poin: string[] } | { p: string })[] = [];
  for (const b of baris) {
    const m = b.match(/^\s*[-•*]\s+(.*)$/);
    if (m) {
      const akhir = blok[blok.length - 1];
      if (akhir && "poin" in akhir) akhir.poin.push(m[1]);
      else blok.push({ poin: [m[1]] });
    } else blok.push({ p: b });
  }
  return (
    <div className={`space-y-3 ${besar ? "text-[clamp(1.1rem,2.4vw,2.2rem)] leading-snug" : "text-base leading-relaxed"}`}>
      {blok.map((x, i) =>
        "poin" in x ? (
          <ul key={i} className="list-disc space-y-2 pl-[1.2em]">{x.poin.map((p, j) => <li key={j}>{p}</li>)}</ul>
        ) : (
          <p key={i}>{x.p}</p>
        ),
      )}
    </div>
  );
}

/** Menampilkan satu slide. besar = mode papan interaktif (huruf besar, layar penuh) */
export function TampilSlide({ s, besar }: { s: Slide; besar?: boolean }) {
  const [buka, setBuka] = useState(false);
  const [pilih, setPilih] = useState<number | null>(null);
  const judul = s.judul && <h2 className={`font-serif ${besar ? "mb-[2vh] text-[clamp(1.8rem,4.5vw,4rem)] leading-tight" : "mb-3 text-3xl"}`}>{s.judul}</h2>;
  if (s.jenis === "isi") return <div>{judul}<TeksSlide teks={s.isi} besar={besar} /></div>;
  if (s.jenis === "gambar")
    return (
      <div className="flex h-full flex-col">
        {judul}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.url} alt={s.judul || "Gambar materi"} className={`mx-auto rounded-xl object-contain ${besar ? "max-h-[60vh]" : "max-h-96"}`} referrerPolicy="no-referrer" />
        {s.isi && <div className="mt-4"><TeksSlide teks={s.isi} besar={besar} /></div>}
      </div>
    );
  if (s.jenis === "video") {
    const id = idYoutube(s.url);
    return (
      <div>
        {judul}
        {id ? (
          <div className={`relative mx-auto aspect-video overflow-hidden rounded-xl bg-black ${besar ? "max-h-[62vh]" : ""}`}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={s.judul || "Video"} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full" />
          </div>
        ) : <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">Buka video</a>}
      </div>
    );
  }
  // soal pilihan ganda
  return (
    <div>
      {judul}
      <p className={besar ? "mb-[3vh] text-[clamp(1.2rem,2.8vw,2.6rem)] leading-snug" : "mb-4 text-lg"}>{s.pertanyaan}</p>
      <ol className={`grid gap-3 ${besar ? "text-[clamp(1rem,2.2vw,2rem)] sm:grid-cols-2" : ""}`}>
        {s.pilihan.map((p, i) => {
          const benar = buka && i === s.kunci;
          const salah = buka && pilih === i && i !== s.kunci;
          return (
            <li key={i}>
              <button type="button" onClick={() => setPilih(i)}
                className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left ring-2 transition ${benar ? "bg-emerald-100 ring-emerald-500" : salah ? "bg-red-100 ring-red-400" : pilih === i ? "bg-sky-50 ring-sky-400" : "bg-white ring-black/10"}`}>
                <span className="font-bold">{String.fromCharCode(65 + i)}.</span><span>{p}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setBuka((v) => !v)} className="rounded-full bg-brand-900 px-5 py-2.5 font-semibold text-white">{buka ? "Sembunyikan jawaban" : "Tampilkan jawaban"}</button>
        {buka && <span className="font-semibold text-emerald-800">Jawaban: {String.fromCharCode(65 + s.kunci)}</span>}
      </div>
      {buka && s.pembahasan && <p className={`mt-3 rounded-xl bg-emerald-50 p-4 ${besar ? "text-[clamp(1rem,1.8vw,1.6rem)]" : "text-sm"}`}>{s.pembahasan}</p>}
    </div>
  );
}
