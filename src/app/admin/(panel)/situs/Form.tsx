"use client";

import { useEffect, useState } from "react";
import { Centang, FormAksi, Input, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { simpanPengaturanSitus, simpanSlide } from "../../actions-situs";

const kotak = "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm";

export type DataSitus = {
  hero_label: string; hero_judul_awal: string; hero_judul_miring: string; hero_judul_akhir: string; hero_teks: string;
  tombol1_label: string; tombol1_url: string; tombol2_label: string; tombol2_url: string; hero_detik: number;
  layanan: { nama: string; keterangan: string; url: string }[];
  sosial_media: { nama: string; akun: string; url: string }[];
  footer_teks: string; seo_judul: string; seo_deskripsi: string; seo_gambar_url: string; persetujuan_wajib: boolean;
};

export function FormHeroTeks({ d }: { d: DataSitus }) {
  return (
    <FormAksi aksi={simpanPengaturanSitus} className="space-y-4">
      <input type="hidden" name="bagian" value="hero" />
      <Input label="Label kecil di atas judul" nama="hero_label" nilai={d.hero_label} maks={80} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Judul (awal)" nama="hero_judul_awal" nilai={d.hero_judul_awal} maks={60} wajib />
        <Input label="Kata miring (warna emas)" nama="hero_judul_miring" nilai={d.hero_judul_miring} maks={40} />
        <Input label="Judul (akhir)" nama="hero_judul_akhir" nilai={d.hero_judul_akhir} maks={60} />
      </div>
      <TextArea label="Teks pendek" nama="hero_teks" nilai={d.hero_teks} baris={2} maks={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tombol 1 — teks" nama="tombol1_label" nilai={d.tombol1_label} maks={40} />
        <Input label="Tombol 1 — tautan" nama="tombol1_url" nilai={d.tombol1_url} maks={300} bantuan="Mis. /profil atau https://…" />
        <Input label="Tombol 2 — teks" nama="tombol2_label" nilai={d.tombol2_label} maks={40} />
        <Input label="Tombol 2 — tautan" nama="tombol2_url" nilai={d.tombol2_url} maks={300} />
      </div>
      <Input label="Ganti foto setiap (detik)" nama="hero_detik" tipe="number" nilai={d.hero_detik} bantuan="6–8 detik. Pengunjung yang mengaktifkan 'kurangi gerakan' tidak melihat pergantian otomatis." />
      <TombolSimpan>Simpan bagian pembuka</TombolSimpan>
    </FormAksi>
  );
}

function BarisTautan({ awalan, kolom, nilai, jumlah, label }: { awalan: string; kolom: { k: string; l: string; ph: string }[]; nilai: Record<string, string>[]; jumlah: number; label: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-3">
          {kolom.map((c) => (
            <input key={c.k} name={`${awalan}_${c.k}_${i}`} defaultValue={nilai[i]?.[c.k] ?? ""} placeholder={c.ph} aria-label={`${label} ${i + 1} — ${c.l}`} className={kotak} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormLayanan({ d }: { d: DataSitus }) {
  return (
    <FormAksi aksi={simpanPengaturanSitus} className="space-y-4">
      <input type="hidden" name="bagian" value="layanan" />
      <BarisTautan awalan="layanan" label="Layanan" jumlah={8} nilai={d.layanan}
        kolom={[{ k: "nama", l: "nama", ph: "Nama layanan" }, { k: "keterangan", l: "keterangan", ph: "Keterangan singkat" }, { k: "url", l: "tautan", ph: "/masuk atau https://… (kosong = segera hadir)" }]} />
      <p className="text-xs text-black/50">Baris kosong diabaikan. Tautan kosong ditampilkan sebagai &quot;Segera hadir&quot;.</p>
      <TombolSimpan>Simpan tautan layanan</TombolSimpan>
    </FormAksi>
  );
}

export function FormFooter({ d }: { d: DataSitus }) {
  return (
    <FormAksi aksi={simpanPengaturanSitus} className="space-y-4">
      <input type="hidden" name="bagian" value="footer" />
      <TextArea label="Teks tambahan di footer" nama="footer_teks" nilai={d.footer_teks} baris={2} maks={400} bantuan="Opsional, mis. jam layanan tamu atau motto." />
      <p className="text-sm font-semibold">Media sosial</p>
      <BarisTautan awalan="sosmed" label="Media sosial" jumlah={6} nilai={d.sosial_media}
        kolom={[{ k: "nama", l: "nama", ph: "Instagram" }, { k: "akun", l: "akun", ph: "@sman22bdg" }, { k: "url", l: "tautan", ph: "https://instagram.com/…" }]} />
      <TombolSimpan>Simpan footer</TombolSimpan>
    </FormAksi>
  );
}

export function FormSeo({ d, situs }: { d: DataSitus; situs: string }) {
  const [judul, setJudul] = useState(d.seo_judul);
  const [desk, setDesk] = useState(d.seo_deskripsi);
  const err = useErrorKolom("seo_gambar");
  return (
    <FormAksi aksi={simpanPengaturanSitus} className="space-y-4">
      <input type="hidden" name="bagian" value="seo" />
      <label className="block text-sm font-semibold">Judul di Google ({judul.length}/70)
        <input name="seo_judul" value={judul} maxLength={70} onChange={(e) => setJudul(e.target.value)} placeholder="SMA Negeri 22 Bandung" className={`mt-1 font-normal ${kotak}`} />
      </label>
      <label className="block text-sm font-semibold">Deskripsi ({desk.length}/170)
        <textarea name="seo_deskripsi" value={desk} maxLength={170} rows={2} onChange={(e) => setDesk(e.target.value)} className={`mt-1 font-normal ${kotak}`} />
      </label>
      <div className="rounded-xl bg-white p-4 ring-1 ring-black/10" aria-label="Pratinjau hasil pencarian">
        <p className="text-xs text-black/50">{situs}</p>
        <p className="text-lg text-[#1a0dab]">{judul || "SMA Negeri 22 Bandung"}</p>
        <p className="text-sm text-black/70">{desk || "Website resmi SMA Negeri 22 Bandung…"}</p>
      </div>
      <label className="block text-sm font-semibold">Gambar saat dibagikan (WhatsApp, Facebook) — 1200×630 disarankan
        <input type="file" name="seo_gambar" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm font-normal" />
        {err && <span className="block text-sm text-blue-teks">{err}</span>}
      </label>
      {d.seo_gambar_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.seo_gambar_url} alt="Gambar berbagi saat ini" className="h-32 rounded-xl object-cover" />
      )}
      <TombolSimpan>Simpan SEO</TombolSimpan>
    </FormAksi>
  );
}

export function FormPersetujuan({ d, boleh }: { d: DataSitus; boleh: boolean }) {
  return (
    <FormAksi aksi={simpanPengaturanSitus} className="space-y-4">
      <input type="hidden" name="bagian" value="persetujuan" />
      <Centang label="Berita wajib disetujui kepala sekolah sebelum tayang" nama="persetujuan_wajib" nilai={d.persetujuan_wajib}
        bantuan={boleh ? "Bila dimatikan, tim humas bisa langsung menerbitkan." : "Hanya kepala sekolah/super admin yang dapat mengubah pengaturan ini."} />
      {boleh && <TombolSimpan>Simpan</TombolSimpan>}
    </FormAksi>
  );
}

export type DataSlide = {
  id?: string; gambar_url?: string; gambar_hp_url?: string; alt: string; fokus_x: number; fokus_y: number; skala: number;
  tautan: string; video_url?: string; urutan: number; aktif: boolean; tayang_mulai: string; tayang_selesai: string;
};

/** Foto pembuka: klik pada pratinjau untuk menentukan titik fokus (bagian yang tidak boleh terpotong) */
export function FormSlide({ s }: { s: DataSlide }) {
  const [fx, setFx] = useState(s.fokus_x);
  const [fy, setFy] = useState(s.fokus_y);
  const [skala, setSkala] = useState(s.skala);
  const [src, setSrc] = useState(s.gambar_url ?? "");
  useEffect(() => () => void (src.startsWith("blob:") && URL.revokeObjectURL(src)), [src]);
  const errG = useErrorKolom("gambar");
  return (
    <FormAksi aksi={simpanSlide} className="space-y-4">
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <input type="hidden" name="fokus_x" value={fx} />
      <input type="hidden" name="fokus_y" value={fy} />
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <div>
          <p className="mb-1 text-sm font-semibold">Pratinjau layar lebar — klik untuk memilih titik fokus</p>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Titik fokus ${fx}% ${fy}%`}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setFx(Math.round(((e.clientX - r.left) / r.width) * 100));
              setFy(Math.round(((e.clientY - r.top) / r.height) * 100));
            }}
            onKeyDown={(e) => {
              const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
              if (!d) return;
              e.preventDefault();
              setFx((v) => Math.min(100, Math.max(0, v + d[0])));
              setFy((v) => Math.min(100, Math.max(0, v + d[1])));
            }}
            className="relative aspect-[16/7] cursor-crosshair overflow-hidden rounded-xl bg-line"
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${fx}% ${fy}%`, transform: `scale(${skala / 100})` }} />
            ) : (
              <span className="grid h-full place-items-center text-sm text-black/40">Pilih foto</span>
            )}
            <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-teks/70 shadow" style={{ left: `${fx}%`, top: `${fy}%` }} />
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Tampilan HP</p>
          <div className="relative mx-auto aspect-[9/16] w-28 overflow-hidden rounded-xl bg-line">
            {(s.gambar_hp_url || src) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.gambar_hp_url || src} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${fx}% ${fy}%`, transform: `scale(${skala / 100})` }} />
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Foto layar lebar {s.id ? "(ganti)" : ""}
          <input type="file" name="gambar" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} className="mt-1 block text-sm font-normal" />
          {errG && <span className="block text-sm text-blue-teks">{errG}</span>}
        </label>
        <label className="text-sm font-semibold">Foto khusus HP (opsional, tegak)
          <input type="file" name="gambar_hp" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm font-normal" />
          {s.gambar_hp_url && <span className="mt-1 flex items-center gap-2 font-normal"><input type="checkbox" name="hapus_hp" /> hapus foto HP</span>}
        </label>
      </div>
      <Input label="Keterangan foto (wajib)" nama="alt" nilai={s.alt} maks={200} wajib bantuan="Dibacakan untuk tunanetra, mis. 'Siswa upacara bendera di lapangan sekolah'." />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Perbesar ({skala}%)
          <input type="range" name="skala" min={100} max={150} value={skala} onChange={(e) => setSkala(Number(e.target.value))} className="mt-2 block w-full" />
        </label>
        <Input label="Urutan" nama="urutan" tipe="number" nilai={s.urutan} />
        <Input label="Tautan saat diklik (opsional)" nama="tautan" nilai={s.tautan} maks={300} placeholder="/berita/…" />
        <div className="sm:col-span-3">
          <Input label="Video latar (opsional)" nama="video_url" nilai={s.video_url ?? ""} maks={500} placeholder="https://…/video.mp4"
            bantuan="Tautan langsung ke berkas MP4/WebM tanpa suara, 10–20 detik, idealnya di bawah 8 MB (unggah di Supabase → Storage → bucket “video”, lalu salin URL publiknya). Foto di atas tetap tampil di HP hemat data dan bagi yang mematikan animasi." />
        </div>
        <Input label="Mulai tayang" nama="tayang_mulai" tipe="datetime-local" nilai={s.tayang_mulai} />
        <Input label="Berhenti tayang" nama="tayang_selesai" tipe="datetime-local" nilai={s.tayang_selesai} />
        <div className="pt-6"><Centang label="Tampilkan" nama="aktif" nilai={s.aktif} /></div>
      </div>
      <TombolSimpan>{s.id ? "Simpan foto" : "Tambah foto pembuka"}</TombolSimpan>
    </FormAksi>
  );
}
