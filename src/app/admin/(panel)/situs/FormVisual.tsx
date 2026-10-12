"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Centang, FormAksi, Input, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { siapkanUnggahVideo, simpanVisual } from "../../actions-visual";

export type DataVisual = {
  id?: string;
  jenis: "gambar" | "video";
  lokasi?: "akun" | "beranda";
  berkas_url?: string;
  poster_url?: string;
  keterangan: string;
  judul_tautan: string;
  tautan: string;
  urutan: number;
  aktif: boolean;
};

/** Halaman tujuan yang sering dipakai; "lain" = isi sendiri */
const TUJUAN = [
  { href: "", label: "Tanpa tautan", judul: "" },
  { href: "/profil#sambutan", label: "Sambutan kepala sekolah", judul: "Baca sambutan kepala sekolah" },
  { href: "/berita?kategori=Prestasi", label: "Prestasi siswa (berita kategori Prestasi)", judul: "Lihat prestasi siswa" },
  { href: "/profil", label: "Profil sekolah", judul: "Kenali sekolah kami" },
  { href: "/berita", label: "Berita terbaru", judul: "Baca berita terbaru" },
  { href: "/galeri", label: "Galeri kegiatan", judul: "Lihat galeri kegiatan" },
  { href: "/agenda", label: "Agenda sekolah", judul: "Lihat agenda" },
  { href: "/spmb", label: "Informasi SPMB", judul: "Info penerimaan murid baru" },
  { href: "/ekskul", label: "Ekskul & OSIS", judul: "Jelajahi ekskul" },
  { href: "/alumni", label: "Alumni", judul: "Kenali alumni kami" },
  { href: "/perpustakaan", label: "Perpustakaan", judul: "Kunjungi perpustakaan" },
];

const kelas =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";

type StatusVideo = { tahap: "kosong" | "unggah" | "siap" | "gagal"; pesan?: string };

export function FormVisual({ v }: { v: DataVisual }) {
  const [jenis, setJenis] = useState<DataVisual["jenis"]>(v.jenis);
  const [lokasi, setLokasi] = useState<"akun" | "beranda">(v.lokasi ?? "akun");
  const [pratinjau, setPratinjau] = useState(v.berkas_url ?? "");
  const [jalurVideo, setJalurVideo] = useState("");
  const [status, setStatus] = useState<StatusVideo>({ tahap: "kosong" });
  const preset = TUJUAN.find((t) => t.href === v.tautan);
  const [pilihan, setPilihan] = useState(preset ? preset.href : "lain");
  const [tautan, setTautan] = useState(v.tautan);
  const [judul, setJudul] = useState(v.judul_tautan);
  useEffect(() => () => void (pratinjau.startsWith("blob:") && URL.revokeObjectURL(pratinjau)), [pratinjau]);

  async function unggahVideo(f: File) {
    setPratinjau(URL.createObjectURL(f));
    setJalurVideo("");
    setStatus({ tahap: "unggah" });
    try {
      const siap = await siapkanUnggahVideo(f.type, f.size);
      if (!siap.ok) return setStatus({ tahap: "gagal", pesan: siap.pesan });
      const { error } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
        .storage.from("video")
        .uploadToSignedUrl(siap.jalur, siap.token, f, { contentType: f.type, cacheControl: "31536000" });
      if (error) return setStatus({ tahap: "gagal", pesan: "Video gagal diunggah. Periksa koneksi, lalu coba lagi." });
      setJalurVideo(siap.jalur);
      setStatus({ tahap: "siap" });
    } catch {
      setStatus({ tahap: "gagal", pesan: "Video gagal diunggah. Periksa koneksi, lalu coba lagi." });
    }
  }

  const sedangUnggah = status.tahap === "unggah";
  const tampilVideo = jenis === "video" && Boolean(pratinjau);
  const tampilGambar = jenis === "gambar" && Boolean(pratinjau);

  return (
    <FormAksi aksi={simpanVisual} className="space-y-4">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <input type="hidden" name="jenis_lama" value={v.jenis} />
      <input type="hidden" name="video_jalur" value={jalurVideo} />
      <input type="hidden" name="tautan" value={tautan} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tampil di</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["akun", "Halaman masuk portal"],
              ["beranda", "Beranda — animasi saat digulir"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ring-1 ${lokasi === k ? "bg-brand-900 text-white ring-brand-900" : "bg-white ring-black/15"}`}>
              <input type="radio" name="lokasi" value={k} checked={lokasi === k} onChange={() => setLokasi(k)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-black/55">
          {lokasi === "beranda"
            ? "Beranda: video diputar maju-mundur mengikuti gulir (paling bagus video 5–10 detik dengan kamera bergerak maju pelan, tanpa suara). Bila berupa gambar, tiap gambar menjadi satu adegan berurutan dengan efek kamera mendekat."
            : "Halaman masuk: memenuhi latar di belakang kartu formulir; lebih dari satu → bergantian otomatis."}
        </p>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Jenis</legend>
        <div className="flex gap-2">
          {(["gambar", "video"] as const).map((j) => (
            <label key={j} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ring-1 ${jenis === j ? "bg-brand-900 text-white ring-brand-900" : "bg-white ring-black/15"}`}>
              <input
                type="radio"
                name="jenis"
                value={j}
                checked={jenis === j}
                onChange={() => {
                  setJenis(j);
                  setPratinjau(j === v.jenis ? (v.berkas_url ?? "") : "");
                  setStatus({ tahap: "kosong" });
                  setJalurVideo("");
                }}
                className="sr-only"
              />
              {j === "gambar" ? "Gambar / foto" : "Video"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {jenis === "gambar" ? (
            <label className="block text-sm font-semibold">
              {v.id && v.jenis === "gambar" ? "Ganti gambar" : "Pilih gambar"}
              <input
                type="file"
                name="gambar"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPratinjau(URL.createObjectURL(f));
                }}
                className="mt-1 block text-sm font-normal"
              />
              <span className="mt-1 block font-normal text-black/50">JPG/PNG/WEBP, maks. 4 MB. Disarankan tegak (potret), mis. 1200×1500 px.</span>
              <ErrorKolom nama="gambar" />
            </label>
          ) : (
            <>
              <label className="block text-sm font-semibold">
                {v.id && v.jenis === "video" ? "Ganti video" : "Pilih video"}
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  disabled={sedangUnggah}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void unggahVideo(f);
                  }}
                  className="mt-1 block text-sm font-normal"
                />
                <span className="mt-1 block font-normal text-black/50">
                  MP4/WEBM, maks. 20 MB — disarankan 6–15 detik, tanpa suara, di bawah 5 MB agar halaman masuk tetap cepat. Video langsung diunggah saat dipilih.
                </span>
              </label>
              <p role="status" className="text-sm">
                {status.tahap === "unggah" && <span className="inline-flex items-center gap-2 text-brand-700"><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-700/30 border-t-brand-700" aria-hidden /> Mengunggah video…</span>}
                {status.tahap === "siap" && <span className="text-emerald-700">✓ Video siap — klik Simpan.</span>}
                {status.tahap === "gagal" && <span className="text-merah">{status.pesan}</span>}
              </p>
              <ErrorKolom nama="video" />
              <label className="block text-sm font-semibold">
                Gambar sampul video (opsional)
                <input type="file" name="poster" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm font-normal" />
                <span className="mt-1 block font-normal text-black/50">Tampil sebelum video berputar, dan bagi pengunjung yang mematikan animasi / hemat data.</span>
                {v.poster_url && (
                  <span className="mt-1 flex items-center gap-2 font-normal">
                    <input type="checkbox" name="hapus_poster" /> hapus sampul
                  </span>
                )}
              </label>
            </>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Pratinjau</p>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-krem-tua">
            {tampilVideo ? (
              <video src={pratinjau} poster={v.poster_url || undefined} muted loop playsInline autoPlay className="h-full w-full object-cover" />
            ) : tampilGambar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pratinjau} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full place-items-center p-4 text-center text-sm text-black/40">Belum ada {jenis}</span>
            )}
          </div>
        </div>
      </div>

      <Input label="Keterangan kecil di pojok" nama="keterangan" nilai={v.keterangan} maks={120} placeholder="Visual ilustratif · model sintetis" bantuan="Mis. 'Juara 1 Lomba Sains 2026' atau 'Visual ilustratif · model sintetis' (wajib bila memakai gambar/video buatan AI)." />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Tautan ke halaman
          <select
            value={pilihan}
            onChange={(e) => {
              const val = e.target.value;
              setPilihan(val);
              if (val === "lain") return;
              const t = TUJUAN.find((x) => x.href === val);
              setTautan(val);
              setJudul(t?.judul ?? "");
            }}
            className={`${kelas} mt-1 font-normal`}
          >
            {TUJUAN.map((t) => (
              <option key={t.href || "kosong"} value={t.href}>
                {t.label}
              </option>
            ))}
            <option value="lain">Halaman lain (isi sendiri)…</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Teks tombol
          <input name="judul_tautan" value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={60} disabled={!tautan && pilihan !== "lain"} placeholder="Selengkapnya" className={`${kelas} mt-1 font-normal disabled:opacity-50`} />
        </label>
      </div>
      {pilihan !== "lain" && <ErrorKolom nama="tautan" />}
      {pilihan === "lain" && (
        <label className="block text-sm font-semibold">
          Alamat halaman
          <input value={tautan} onChange={(e) => setTautan(e.target.value)} maxLength={300} placeholder="/berita/judul-berita atau https://…" className={`${kelas} mt-1 font-normal`} />
          <span className="mt-1 block font-normal text-black/50">Salin dari bilah alamat, mis. /berita/juara-olimpiade-sains — atau https:// untuk situs luar.</span>
          <ErrorKolom nama="tautan" />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Urutan" nama="urutan" tipe="number" nilai={v.urutan} />
        <div className="pt-6 sm:col-span-2">
          <Centang label="Tampilkan" nama="aktif" nilai={v.aktif} />
        </div>
      </div>

      {sedangUnggah ? (
        <button type="button" disabled className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white opacity-60">
          Tunggu video selesai terunggah…
        </button>
      ) : (
        <TombolSimpan>{v.id ? "Simpan visual" : "Tambah visual"}</TombolSimpan>
      )}
    </FormAksi>
  );
}

/** Pesan error per kolom dari server (harus di dalam FormAksi agar membaca konteks error) */
function ErrorKolom({ nama }: { nama: string }) {
  const e = useErrorKolom(nama);
  return e ? <span className="block text-sm font-normal text-merah">{e}</span> : null;
}
