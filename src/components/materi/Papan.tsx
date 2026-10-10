"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/kurikulum";
import { TampilSlide } from "./Slide";

/**
 * Mode papan interaktif (layar sentuh / IFP): slide besar, coretan di atas slide,
 * papan tulis kosong, pewaktu, dan pemilih siswa acak. Semua berjalan di perangkat — tidak ada yang dikirim ke server.
 */
type Kelas = { id: string; nama: string; siswa: string[] };
const WARNA = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#ffffff"];

export function Papan({ judul, slide, kelas }: { judul: string; slide: Slide[]; kelas: Kelas[] }) {
  const halaman = slide.length ? slide : [];
  const [i, setI] = useState(0);
  const [kosong, setKosong] = useState(halaman.length === 0);
  const [pena, setPena] = useState(halaman.length === 0);
  const [warna, setWarna] = useState(WARNA[0]);
  const [tebal, setTebal] = useState(4);
  const [hapus, setHapus] = useState(false);
  const [panel, setPanel] = useState<"" | "waktu" | "acak">("");
  const kanvas = useRef<HTMLCanvasElement>(null);
  const coretan = useRef(new Map<string, ImageData>());
  const gambar = useRef<{ x: number; y: number } | null>(null);
  const kunci = kosong ? "papan" : `s${i}`;
  const kunciRef = useRef(kunci);

  // simpan coretan halaman lama, muat coretan halaman baru
  const gantiHalaman = useCallback((baru: string) => {
    const c = kanvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    coretan.current.set(kunciRef.current, ctx.getImageData(0, 0, c.width, c.height));
    ctx.clearRect(0, 0, c.width, c.height);
    const ada = coretan.current.get(baru);
    if (ada) ctx.putImageData(ada, 0, 0);
    kunciRef.current = baru;
  }, []);
  useEffect(() => { gantiHalaman(kunci); }, [kunci, gantiHalaman]);

  // ukuran kanvas mengikuti layar
  useEffect(() => {
    const c = kanvas.current;
    if (!c) return;
    const atur = () => {
      const ctx = c.getContext("2d")!;
      const lama = c.width ? ctx.getImageData(0, 0, c.width, c.height) : null;
      c.width = c.clientWidth * devicePixelRatio;
      c.height = c.clientHeight * devicePixelRatio;
      if (lama) ctx.putImageData(lama, 0, 0);
    };
    atur();
    addEventListener("resize", atur);
    return () => removeEventListener("resize", atur);
  }, []);

  const maju = useCallback((d: number) => { setKosong(false); setI((x) => Math.min(Math.max(0, x + d), Math.max(0, halaman.length - 1))); }, [halaman.length]);
  const layarPenuh = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  const bersihkan = () => { const c = kanvas.current; c?.getContext("2d")?.clearRect(0, 0, c.width, c.height); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !pena)) { e.preventDefault(); maju(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") maju(-1);
      if (e.key === "p") setPena((v) => !v);
      if (e.key === "f") layarPenuh();
      if (e.key === "b") setKosong((v) => !v);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [maju, pena]);

  const titik = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio };
  };
  const mulaiGambar = (e: React.PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); gambar.current = titik(e); };
  const geser = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!gambar.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = titik(e);
    ctx.globalCompositeOperation = hapus ? "destination-out" : "source-over";
    ctx.strokeStyle = warna;
    ctx.lineWidth = (hapus ? tebal * 6 : tebal) * devicePixelRatio * (e.pressure && e.pointerType === "pen" ? 0.5 + e.pressure : 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(gambar.current.x, gambar.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    gambar.current = p;
  };

  // geser jari untuk pindah slide (saat pena mati)
  const sentuh = useRef<number | null>(null);
  const tombol = "grid h-12 min-w-12 place-items-center rounded-full px-3 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/10 disabled:opacity-30";

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-tinta select-none">
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => { if (!pena) sentuh.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (sentuh.current == null) return; const d = e.changedTouches[0].clientX - sentuh.current; if (Math.abs(d) > 80) maju(d < 0 ? 1 : -1); sentuh.current = null; }}
      >
        {!kosong && halaman[i] && (
          <div className="absolute inset-0 overflow-y-auto px-[6vw] py-[6vh]">
            <TampilSlide key={i} s={halaman[i]} besar />
          </div>
        )}
        {kosong && <div className="absolute inset-0 bg-[radial-gradient(circle,#0000000f_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden />}
        <canvas
          ref={kanvas}
          className={`absolute inset-0 h-full w-full touch-none ${pena ? "cursor-crosshair" : "pointer-events-none"}`}
          onPointerDown={mulaiGambar}
          onPointerMove={geser}
          onPointerUp={() => (gambar.current = null)}
          onPointerCancel={() => (gambar.current = null)}
          aria-label="Area coretan"
        />
        {panel === "waktu" && <Pewaktu tutup={() => setPanel("")} />}
        {panel === "acak" && <PilihAcak kelas={kelas} tutup={() => setPanel("")} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-brand-900 px-3 py-2 text-white">
        <span className="mr-2 hidden max-w-64 truncate font-serif text-lg lg:block" title={judul}>{judul}</span>
        <button className={tombol} onClick={() => maju(-1)} disabled={kosong || i === 0} aria-label="Slide sebelumnya">◀</button>
        <span className="min-w-16 text-center text-sm tabular-nums">{kosong ? "Papan" : `${i + 1} / ${halaman.length}`}</span>
        <button className={tombol} onClick={() => maju(1)} disabled={kosong ? halaman.length === 0 : i >= halaman.length - 1} aria-label="Slide berikutnya">▶</button>
        <span className="mx-1 h-8 w-px bg-white/20" />
        <button className={`${tombol} ${pena && !hapus ? "bg-white text-brand-900" : ""}`} onClick={() => { setPena(!pena || hapus); setHapus(false); }} aria-pressed={pena && !hapus}>✎ Pena</button>
        {pena && (
          <>
            {WARNA.map((w) => (
              <button key={w} onClick={() => { setWarna(w); setHapus(false); }} aria-label={`Warna ${w}`}
                className={`h-8 w-8 rounded-full ring-2 ${warna === w && !hapus ? "ring-accent-400" : "ring-white/30"}`} style={{ background: w }} />
            ))}
            <select value={tebal} onChange={(e) => setTebal(Number(e.target.value))} className="rounded-full bg-white/10 px-2 py-2 text-sm" aria-label="Ketebalan">
              {[2, 4, 8, 14].map((t) => <option key={t} value={t} className="text-black">{t}px</option>)}
            </select>
            <button className={`${tombol} ${hapus ? "bg-white text-brand-900" : ""}`} onClick={() => setHapus((v) => !v)} aria-pressed={hapus}>⌫ Penghapus</button>
            <button className={tombol} onClick={bersihkan}>Bersihkan</button>
          </>
        )}
        <span className="mx-1 h-8 w-px bg-white/20" />
        <button className={`${tombol} ${kosong ? "bg-white text-brand-900" : ""}`} onClick={() => setKosong((v) => !v)} aria-pressed={kosong}>Papan tulis</button>
        <button className={`${tombol} ${panel === "waktu" ? "bg-white text-brand-900" : ""}`} onClick={() => setPanel(panel === "waktu" ? "" : "waktu")}>⏱ Waktu</button>
        <button className={`${tombol} ${panel === "acak" ? "bg-white text-brand-900" : ""}`} onClick={() => setPanel(panel === "acak" ? "" : "acak")} disabled={!kelas.length}>🎲 Pilih siswa</button>
        <span className="flex-1" />
        <button className={tombol} onClick={layarPenuh} aria-label="Layar penuh">⛶</button>
        <button className={tombol} onClick={() => window.close()} aria-label="Tutup">✕</button>
      </div>
    </div>
  );
}

function bunyi() {
  try {
    const a = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = a.createOscillator(); const g = a.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.3, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.3);
      o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.3);
    });
  } catch { /* perangkat tanpa audio */ }
}

function Pewaktu({ tutup }: { tutup: () => void }) {
  const [sisa, setSisa] = useState(0);
  const [jalan, setJalan] = useState(false);
  useEffect(() => {
    if (!jalan) return;
    const t = setInterval(() => setSisa((s) => {
      if (s <= 1) { setJalan(false); bunyi(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [jalan]);
  const mm = String(Math.floor(sisa / 60)).padStart(2, "0"), ss = String(sisa % 60).padStart(2, "0");
  return (
    <div className="absolute right-4 top-4 w-80 rounded-3xl bg-brand-900 p-5 text-white shadow-2xl">
      <div className="flex items-center"><p className="flex-1 text-sm uppercase tracking-widest text-white/60">Pewaktu</p><button onClick={tutup} aria-label="Tutup pewaktu">✕</button></div>
      <p className={`my-3 text-center font-mono text-7xl tabular-nums ${sisa > 0 && sisa <= 10 && jalan ? "text-accent-400" : ""}`} aria-live="polite">{mm}:{ss}</p>
      <div className="grid grid-cols-4 gap-2 text-sm">
        {[1, 3, 5, 10].map((m) => <button key={m} onClick={() => { setSisa(m * 60); setJalan(true); }} className="rounded-full py-2 ring-1 ring-white/30 hover:bg-white/10">{m} mnt</button>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <button onClick={() => setJalan((v) => !v)} disabled={!sisa} className="rounded-full bg-accent-400 py-2 font-semibold text-brand-900 disabled:opacity-40">{jalan ? "Jeda" : "Lanjut"}</button>
        <button onClick={() => { setJalan(false); setSisa(0); }} className="rounded-full py-2 ring-1 ring-white/30">Ulang</button>
      </div>
    </div>
  );
}

function PilihAcak({ kelas, tutup }: { kelas: Kelas[]; tutup: () => void }) {
  const [kid, setKid] = useState(kelas[0]?.id ?? "");
  const [nama, setNama] = useState("");
  const [sudah, setSudah] = useState<string[]>([]);
  const [putar, setPutar] = useState(false);
  const daftar = kelas.find((k) => k.id === kid)?.siswa ?? [];
  const sisa = daftar.filter((n) => !sudah.includes(n));
  const acak = () => {
    const pool = sisa.length ? sisa : daftar;
    if (!pool.length) return;
    if (!sisa.length) setSudah([]);
    setPutar(true);
    let n = 0;
    const t = setInterval(() => {
      setNama(pool[Math.floor(Math.random() * pool.length)]);
      if (++n > 14) {
        clearInterval(t);
        const pilih = pool[Math.floor(Math.random() * pool.length)];
        setNama(pilih);
        setSudah((s) => [...s, pilih]);
        setPutar(false);
      }
    }, 70);
  };
  return (
    <div className="absolute right-4 top-4 w-96 max-w-[calc(100%-2rem)] rounded-3xl bg-brand-900 p-5 text-white shadow-2xl">
      <div className="flex items-center"><p className="flex-1 text-sm uppercase tracking-widest text-white/60">Pilih siswa acak</p><button onClick={tutup} aria-label="Tutup">✕</button></div>
      <select value={kid} onChange={(e) => { setKid(e.target.value); setSudah([]); setNama(""); }} className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2" aria-label="Kelas">
        {kelas.map((k) => <option key={k.id} value={k.id} className="text-black">{k.nama} ({k.siswa.length})</option>)}
      </select>
      <p className={`my-5 min-h-20 text-center font-serif text-5xl leading-tight ${putar ? "opacity-70" : "text-accent-400"}`} aria-live="polite">{nama || "—"}</p>
      <button onClick={acak} disabled={putar || !daftar.length} className="w-full rounded-full bg-accent-400 py-3 font-semibold text-brand-900 disabled:opacity-40">Acak!</button>
      <p className="mt-2 text-center text-xs text-white/60">Tidak mengulang sampai semua terpanggil · {sudah.length}/{daftar.length}</p>
    </div>
  );
}
