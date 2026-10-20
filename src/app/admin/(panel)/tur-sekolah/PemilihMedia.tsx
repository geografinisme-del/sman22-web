"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, Monitor, Smartphone, Video } from "lucide-react";
import { mintaUnggahanTur } from "../../actions-tur";

type Awal = { tipe: "foto" | "video"; media: string; poster: string; fokusX: number; fokusY: number };

const MAKS_FOTO = 20 * 1024 * 1024;
const MAKS_VIDEO = 8 * 1024 * 1024;

/** Durasi video lokal (detik) dari metadata browser — pemeriksaan awal; server memeriksa ulang dari isi berkas. */
function durasiLokal(file: File) {
  return new Promise<number>((selesai) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      selesai(v.duration);
    };
    v.onerror = () => selesai(NaN);
    v.src = URL.createObjectURL(file);
  });
}

/**
 * Media titik tur: pilih foto/video, unggah langsung ke Storage (URL bertanda tangan dari server),
 * pilih titik fokus dengan mengeklik pratinjau, dan pratinjau tampilan desktop (16:9) / HP (9:16).
 * Menulis input tersembunyi: media_tipe, unggahan_media, unggahan_poster, fokus_x, fokus_y.
 */
export function PemilihMedia({ awal }: { awal: Awal }) {
  const [tipe, setTipe] = useState<"foto" | "video">(awal.tipe);
  const [media, setMedia] = useState(awal.media); // URL tampil (asli atau pratinjau lokal)
  const [poster, setPoster] = useState(awal.poster);
  const [jalurMedia, setJalurMedia] = useState("");
  const [jalurPoster, setJalurPoster] = useState("");
  const [fokus, setFokus] = useState({ x: awal.fokusX, y: awal.fokusY });
  const [layar, setLayar] = useState<"desktop" | "hp">("desktop");
  const [proses, setProses] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const bingkai = useRef<HTMLDivElement>(null);

  const unggah = async (file: File, jenis: "foto" | "video" | "poster") => {
    setGalat(null);
    if (jenis === "video") {
      if (file.type !== "video/mp4") return setGalat("Video harus berformat MP4.");
      if (file.size > MAKS_VIDEO) return setGalat(`Video ${(file.size / 1048576).toFixed(1)} MB — maksimal 8 MB.`);
      const d = await durasiLokal(file);
      if (!(d > 0)) return setGalat("Durasi video tidak terbaca. Pastikan berkas MP4 yang valid.");
      if (d > 15.05) return setGalat(`Video ${d.toFixed(1)} detik — maksimal 15 detik.`);
    } else {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setGalat("Foto harus JPG, PNG, atau WEBP.");
      if (file.size > MAKS_FOTO) return setGalat("Foto maksimal 20 MB.");
    }
    setProses(jenis === "video" ? "Mengunggah video…" : "Mengunggah foto…");
    try {
      const izin = await mintaUnggahanTur(jenis, file.type, file.size);
      if (!izin.ok) throw new Error(izin.pesan);
      const r = await fetch(izin.url, { method: "PUT", body: file, headers: { "Content-Type": file.type, "x-upsert": "false" } });
      if (!r.ok) throw new Error("Unggahan gagal. Periksa koneksi lalu coba lagi.");
      const lokal = URL.createObjectURL(file);
      if (jenis === "poster") {
        setJalurPoster(izin.jalur);
        setPoster(lokal);
      } else {
        setJalurMedia(izin.jalur);
        setMedia(lokal);
      }
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setProses(null);
    }
  };

  const pilihFokus = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = bingkai.current!.getBoundingClientRect();
    setFokus({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
  };
  const gantiTipe = (t: "foto" | "video") => {
    if (t === tipe) return;
    setTipe(t);
    setJalurMedia("");
    setMedia(t === awal.tipe ? awal.media : "");
    setPoster(t === "video" ? awal.poster : "");
  };
  const gambarPratinjau = tipe === "video" ? poster : media;

  return (
    <fieldset className="grid gap-4 rounded-xl border border-[var(--line)] p-4 sm:col-span-2">
      <legend className="px-1 font-semibold">Media</legend>
      <input type="hidden" name="media_tipe" value={tipe} />
      <input type="hidden" name="unggahan_media" value={jalurMedia} />
      <input type="hidden" name="unggahan_poster" value={jalurPoster} />
      <input type="hidden" name="fokus_x" value={fokus.x} />
      <input type="hidden" name="fokus_y" value={fokus.y} />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis media">
        {(["foto", "video"] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={tipe === t} onClick={() => gantiTipe(t)} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ${tipe === t ? "bg-[var(--ink)] text-white ring-[var(--ink)]" : "ring-[var(--line)] hover:bg-black/5"}`}>
            {t === "foto" ? <ImageUp size={16} aria-hidden /> : <Video size={16} aria-hidden />}
            {t === "foto" ? "Foto" : "Video"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{tipe === "foto" ? "Unggah foto (JPG/PNG/WEBP, dikompres ke WebP maks 2400px)" : "Unggah video (MP4, maks 15 detik / 8 MB)"}</span>
          <input type="file" accept={tipe === "foto" ? "image/jpeg,image/png,image/webp" : "video/mp4"} onChange={(e) => e.target.files?.[0] && unggah(e.target.files[0], tipe)} disabled={!!proses} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--soft)] file:px-4 file:py-2 file:font-semibold" />
        </label>
        {tipe === "video" && (
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Poster video (wajib; gambar sampul)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && unggah(e.target.files[0], "poster")} disabled={!!proses} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--soft)] file:px-4 file:py-2 file:font-semibold" />
          </label>
        )}
      </div>
      {proses && (
        <p role="status" className="flex items-center gap-2 text-sm text-black/60">
          <Loader2 size={16} className="animate-spin" aria-hidden /> {proses}
        </p>
      )}
      {galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {galat}
        </p>
      )}
      {(jalurMedia || jalurPoster) && <p className="text-sm text-emerald-700">Berkas terunggah. Klik “Simpan” untuk menerapkan.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-black/60">
          Klik pratinjau untuk memilih titik fokus ({fokus.x}% , {fokus.y}%).
        </p>
        <div className="flex gap-1" role="radiogroup" aria-label="Pratinjau layar">
          {(["desktop", "hp"] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={layar === l} onClick={() => setLayar(l)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 ${layar === l ? "bg-[var(--blue)] text-white ring-[var(--blue)]" : "ring-[var(--line)]"}`}>
              {l === "desktop" ? <Monitor size={15} aria-hidden /> : <Smartphone size={15} aria-hidden />}
              {l === "desktop" ? "Desktop" : "HP"}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={bingkai}
        onClick={pilihFokus}
        className={`relative cursor-crosshair overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--sky-1)] via-[var(--sky-2)] to-[var(--sky-3)] ${layar === "desktop" ? "aspect-video w-full" : "mx-auto aspect-[9/16] w-[220px]"}`}
        aria-label="Pratinjau media; klik untuk memilih titik fokus"
      >
        {tipe === "video" && media && !poster ? (
          <video src={media} muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${fokus.x}% ${fokus.y}%` }} />
        ) : gambarPratinjau ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob:) tidak lewat next/image
          <img src={gambarPratinjau} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${fokus.x}% ${fokus.y}%` }} />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-6xl font-extrabold text-white/60">22</span>
        )}
        <span className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" style={{ left: `${fokus.x}%`, top: `${fokus.y}%` }} aria-hidden />
      </div>
      {awal.media && !jalurMedia && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hapus_media" className="h-4 w-4" /> Hapus media (tampilkan blok “Foto menyusul”)
        </label>
      )}
    </fieldset>
  );
}
