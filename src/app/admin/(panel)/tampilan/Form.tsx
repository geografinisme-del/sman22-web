"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { FormAksi, Input, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { Ikon } from "@/components/Ikon";
import { DAFTAR_IKON, ISI_OTOMATIS, LABEL_IKON, type IsiOtomatis, type KartuBento, type NamaIkon, type Tema } from "@/lib/tema";
import { simpanTema } from "../../actions-tema";

const kelas =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[15px] outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";

/** Pilihan halaman tujuan yang umum */
const TUJUAN = [
  ["/profil", "Profil sekolah"],
  ["/sambutan", "Sambutan kepala sekolah"],
  ["/program", "Program unggulan"],
  ["/berita", "Berita"],
  ["/berita?kategori=Prestasi", "Prestasi siswa"],
  ["/agenda", "Agenda"],
  ["/galeri", "Galeri"],
  ["/spmb", "SPMB"],
  ["/ekskul", "Ekskul & OSIS"],
  ["/alumni", "Alumni"],
  ["/perpustakaan", "Perpustakaan"],
  ["/kontak", "Kontak"],
  ["/masuk", "Masuk portal"],
] as const;

const PALET = [
  { nama: "Kobalt & ungu (bawaan)", utama: "#284fd7", aksen: "#7c5cff", gelap: "#0b0a1a" },
  { nama: "Merah marun (logo)", utama: "#b3123a", aksen: "#e2a33b", gelap: "#140a0d" },
  { nama: "Hijau sekolah", utama: "#1f7a4d", aksen: "#36c58a", gelap: "#07140e" },
  { nama: "Biru laut", utama: "#0e6fb8", aksen: "#22c1d6", gelap: "#06121c" },
  { nama: "Jingga hangat", utama: "#d2561e", aksen: "#f2b23d", gelap: "#140b06" },
];

function ErrorKolom({ nama }: { nama: string }) {
  const e = useErrorKolom(nama);
  return e ? <span className="block text-sm font-normal text-merah">{e}</span> : null;
}

export function TombolReset({ yang }: { yang: "warna" | "beranda" | "masuk" }) {
  return (
    <FormAksi aksi={simpanTema} className="contents">
      <input type="hidden" name="bagian" value="reset" />
      <input type="hidden" name="yang" value={yang} />
      <button type="submit" className="text-sm text-black/55 underline hover:text-merah">
        Kembalikan bawaan
      </button>
    </FormAksi>
  );
}

/* ---------------- warna ---------------- */
export function FormWarna({ w }: { w: Tema["warna"] }) {
  const [warna, setWarna] = useState(w);
  return (
    <FormAksi aksi={simpanTema} className="space-y-5">
      <input type="hidden" name="bagian" value="warna" />
      <div>
        <p className="mb-2 text-sm font-semibold">Palet siap pakai</p>
        <div className="flex flex-wrap gap-2">
          {PALET.map((p) => (
            <button
              key={p.nama}
              type="button"
              onClick={() => setWarna({ utama: p.utama, aksen: p.aksen, gelap: p.gelap })}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm ring-1 ring-black/10 hover:ring-black/30"
            >
              <span className="flex">
                {[p.utama, p.aksen, p.gelap].map((c) => (
                  <span key={c} className="-ml-1 h-5 w-5 rounded-full ring-2 ring-white first:ml-0" style={{ background: c }} />
                ))}
              </span>
              {p.nama}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["utama", "Warna utama", "Tombol, tautan, judul kecil"],
            ["aksen", "Warna aksen", "Cahaya, gradasi, sorotan"],
            ["gelap", "Warna latar gelap", "Hero, kartu kaca, halaman masuk"],
          ] as const
        ).map(([k, label, bantuan]) => (
          <label key={k} className="block text-sm font-semibold">
            {label}
            <span className="mt-1 flex items-center gap-2">
              <input type="color" value={warna[k]} onChange={(e) => setWarna({ ...warna, [k]: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-black/15 bg-white p-1" aria-label={`${label} (pemilih)`} />
              <input name={k} value={warna[k]} onChange={(e) => setWarna({ ...warna, [k]: e.target.value })} maxLength={7} className={kelas} />
            </span>
            <span className="mt-1 block font-normal text-black/50">{bantuan}</span>
            <ErrorKolom nama={k} />
          </label>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Pratinjau</p>
        <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-[#e3e5e8] bg-white p-6">
          <span className="rounded-lg px-5 py-3 text-sm font-semibold text-white" style={{ background: warna.utama }}>
            Tombol utama
          </span>
          <span className="rounded-lg border px-5 py-3 text-sm font-semibold" style={{ borderColor: warna.utama, color: warna.utama }}>
            Masuk Portal
          </span>
          <span className="font-semibold underline underline-offset-4" style={{ color: warna.utama }}>
            Tautan
          </span>
          <span className="border-l-4 bg-[#faf8f5] px-3 py-2 text-sm" style={{ borderColor: warna.aksen }}>
            Blok pengumuman
          </span>
        </div>
      </div>
      <TombolSimpan>Simpan warna</TombolSimpan>
    </FormAksi>
  );
}

/* ---------------- beranda ---------------- */
export function FormBeranda({ b }: { b: Tema["beranda"] }) {
  return (
    <FormAksi aksi={simpanTema} className="space-y-5">
      <input type="hidden" name="bagian" value="beranda" />
      {/* bidang beranda sinematik lama tidak dipakai lagi; nilainya disimpan apa adanya agar data tetap utuh */}
      {b.efekGulir && <input type="hidden" name="efekGulir" value="on" />}
      <input type="hidden" name="teksRaksasa" value={b.teksRaksasa} />
      <input type="hidden" name="b2_label" value={b.babak2.label} />
      <input type="hidden" name="b2_judul" value={b.babak2.judul} />
      <input type="hidden" name="b2_miring" value={b.babak2.miring} />
      <input type="hidden" name="b3_label" value={b.babak3.label} />
      <input type="hidden" name="b3_judul" value={b.babak3.judul} />
      <input type="hidden" name="b3_miring" value={b.babak3.miring} />
      <input type="hidden" name="pitaJudul" value={b.pitaJudul} />
      <input type="hidden" name="bentoMiring" value={b.bentoMiring} />
      <Input label="Judul bagian akses layanan" nama="bentoJudul" nilai={b.bentoJudul} maks={60} bantuan="Tampil di beranda, di samping daftar pengumuman." />
      <TextArea label="Teks pengantar (opsional)" nama="bentoTeks" nilai={b.bentoTeks} maks={240} baris={2} />
      <TombolSimpan>Simpan beranda</TombolSimpan>
    </FormAksi>
  );
}

/* ---------------- kartu bento ---------------- */
type Baris = KartuBento & { id: string; hapusGambar?: boolean };
const idBaru = () => Math.random().toString(36).slice(2, 10);

function PilihIkon({ nilai, ubah, kosong = true }: { nilai: NamaIkon | ""; ubah: (v: NamaIkon | "") => void; kosong?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-900 text-white">
        <Ikon nama={nilai} size={18} />
      </span>
      <select value={nilai} onChange={(e) => ubah(e.target.value as NamaIkon | "")} className={kelas}>
        {kosong && <option value="">Tanpa ikon</option>}
        {DAFTAR_IKON.map((n) => (
          <option key={n} value={n}>
            {LABEL_IKON[n]}
          </option>
        ))}
      </select>
    </span>
  );
}

function PilihTujuan({ nilai, ubah }: { nilai: string; ubah: (v: string) => void }) {
  const preset = TUJUAN.some(([h]) => h === nilai);
  const [lain, setLain] = useState(!preset && nilai !== "");
  return (
    <span className="grid gap-2">
      <select
        value={lain ? "lain" : nilai}
        onChange={(e) => {
          if (e.target.value === "lain") return setLain(true);
          setLain(false);
          ubah(e.target.value);
        }}
        className={kelas}
      >
        <option value="">Tanpa tautan</option>
        {TUJUAN.map(([h, l]) => (
          <option key={h} value={h}>
            {l}
          </option>
        ))}
        <option value="lain">Halaman lain (isi sendiri)…</option>
      </select>
      {lain && <input value={nilai} onChange={(e) => ubah(e.target.value)} placeholder="/berita/judul-berita atau https://…" maxLength={300} className={kelas} />}
    </span>
  );
}

export function FormBento({ kartu }: { kartu: KartuBento[] }) {
  const [daftar, setDaftar] = useState<Baris[]>(() => kartu.map((k, i) => ({ ...k, id: `k${i}` })));
  const [pratinjau, setPratinjau] = useState<Record<string, string>>({});
  const ubah = (id: string, p: Partial<Baris>) => setDaftar((d) => d.map((k) => (k.id === id ? { ...k, ...p } : k)));
  const pindah = (i: number, arah: number) =>
    setDaftar((d) => {
      const j = i + arah;
      if (j < 0 || j >= d.length) return d;
      const x = [...d];
      [x[i], x[j]] = [x[j], x[i]];
      return x;
    });

  return (
    <FormAksi aksi={simpanTema} className="space-y-4">
      <input type="hidden" name="bagian" value="bento" />
      <input type="hidden" name="bento_json" value={JSON.stringify(daftar)} />
      <ol className="space-y-3">
        {daftar.map((k, i) => {
          const gambar = pratinjau[k.id] || (k.hapusGambar ? "" : k.gambar);
          return (
            <li key={k.id} className="rounded-2xl bg-krem p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Kartu {i + 1} <span className="font-normal text-black/50">· {k.judul || k.label || "tanpa judul"}</span>
                </p>
                <span className="flex gap-1">
                  <button type="button" onClick={() => pindah(i, -1)} disabled={i === 0} className="rounded-lg p-2 hover:bg-white disabled:opacity-30" aria-label="Naikkan">
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" onClick={() => pindah(i, 1)} disabled={i === daftar.length - 1} className="rounded-lg p-2 hover:bg-white disabled:opacity-30" aria-label="Turunkan">
                    <ArrowDown size={16} />
                  </button>
                  <button type="button" onClick={() => setDaftar((d) => d.filter((x) => x.id !== k.id))} className="rounded-lg p-2 text-merah hover:bg-white" aria-label="Hapus kartu">
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px]">
                <label className="block text-sm font-semibold">
                  Label kecil
                  <input value={k.label} onChange={(e) => ubah(k.id, { label: e.target.value })} maxLength={50} className={`${kelas} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-semibold">
                  Judul
                  <input value={k.judul} onChange={(e) => ubah(k.id, { judul: e.target.value })} maxLength={90} className={`${kelas} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-semibold">
                  Ukuran
                  <select value={k.ukuran} onChange={(e) => ubah(k.id, { ukuran: e.target.value as KartuBento["ukuran"] })} className={`${kelas} mt-1 font-normal`}>
                    <option value="biasa">Biasa (1 kotak)</option>
                    <option value="lebar">Lebar (2 kotak)</option>
                    <option value="besar">Besar (2×2 kotak)</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold lg:col-span-2">
                  Teks singkat
                  <input value={k.teks} onChange={(e) => ubah(k.id, { teks: e.target.value })} maxLength={200} className={`${kelas} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-semibold">
                  Isi otomatis
                  <select value={k.isi} onChange={(e) => ubah(k.id, { isi: e.target.value as IsiOtomatis })} className={`${kelas} mt-1 font-normal`}>
                    {Object.entries(ISI_OTOMATIS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-sm font-semibold">
                  Ikon
                  <div className="mt-1 font-normal">
                    <PilihIkon nilai={k.ikon} ubah={(v) => ubah(k.id, { ikon: v })} />
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  Halaman tujuan
                  <div className="mt-1 font-normal">
                    <PilihTujuan nilai={k.tautan} ubah={(v) => ubah(k.id, { tautan: v })} />
                  </div>
                  <ErrorKolom nama={`tautan_${k.id}`} />
                </div>
                <div className="text-sm font-semibold">
                  Gambar latar
                  <div className="mt-1 flex items-center gap-2 font-normal">
                    {gambar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gambar} alt="" className="h-12 w-16 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-12 w-16 place-items-center rounded-lg bg-white text-[10px] text-black/40">kosong</span>
                    )}
                    <span className="grid gap-1">
                      <input
                        type="file"
                        name={`gambar_${k.id}`}
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setPratinjau((p) => ({ ...p, [k.id]: URL.createObjectURL(f) }));
                        }}
                        className="w-full text-xs"
                      />
                      {k.gambar && !k.hapusGambar && (
                        <button type="button" onClick={() => ubah(k.id, { hapusGambar: true })} className="text-left text-xs text-merah underline">
                          hapus gambar
                        </button>
                      )}
                    </span>
                  </div>
                  <ErrorKolom nama={`gambar_${k.id}`} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {daftar.length < 10 && (
        <button
          type="button"
          onClick={() => setDaftar((d) => [...d, { id: idBaru(), label: "", judul: "Kartu baru", teks: "", tautan: "/profil", ikon: "Sparkles", gambar: "", ukuran: "biasa", isi: "" }])}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-700/30 hover:bg-white"
        >
          <Plus size={16} /> Tambah kartu
        </button>
      )}
      <p className="text-sm text-black/55">Kartu besar & kartu galeri tanpa gambar memakai foto dari Galeri secara otomatis. Gambar maks. 4 MB.</p>
      <TombolSimpan>Simpan kartu</TombolSimpan>
    </FormAksi>
  );
}

/* ---------------- halaman masuk ---------------- */
export function FormMasuk({ m }: { m: Tema["masuk"] }) {
  const fitur = [0, 1, 2, 3].map((i) => m.fitur[i] ?? { ikon: "Sparkles" as NamaIkon, teks: "" });
  return (
    <FormAksi aksi={simpanTema} className="space-y-5">
      <input type="hidden" name="bagian" value="masuk" />
      <Input label="Judul halaman masuk" nama="judul" nilai={m.judul} maks={60} bantuan="Sebaiknya langsung, mis. “Masuk ke Portal Sekolah”." />
      <Input label="Teks di bawah judul" nama="deskripsi" nilai={m.deskripsi} maks={160} />
      {/* judul miring & label fitur tidak ditampilkan lagi; nilainya disimpan apa adanya */}
      <input type="hidden" name="miring" value={m.miring} />
      {fitur.map((f, i) => (
        <span key={i}>
          <input type="hidden" name={`fitur_ikon_${i}`} value={f.ikon} />
          <input type="hidden" name={`fitur_teks_${i}`} value={f.teks} />
        </span>
      ))}
      <p className="text-sm text-black/55">Foto panel halaman masuk diambil dari Tampilan Website → Visual halaman masuk (gambar pertama); tanpa visual, dipakai foto gedung sekolah.</p>
      <TombolSimpan>Simpan halaman masuk</TombolSimpan>
    </FormAksi>
  );
}
