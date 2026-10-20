"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, GripVertical, Monitor, Plus, RotateCcw, Smartphone, Trash2, X } from "lucide-react";
import { bacaKonfigurasi, bolehTambah, lepasWidget, periksaKompatibilitas, pindahkan, tambahWidget, type Konfigurasi } from "@/lib/tampilan/konfigurasi";
import { FONT, GERAK, PALET, TEMA, type KunciTema } from "@/lib/tampilan/token";
import { DEFINISI_WIDGET, JENIS_WIDGET, type JenisWidget, type WidgetInstans } from "@/lib/tampilan/widget";
import { pulihkanTampilan, simpanDrafTampilan, terbitkanTampilan } from "../../actions-tampilan";

type Riwayat = { id: number; waktu: string; catatan: string; oleh: string };
type Bidang =
  | { k: string; label: string; tipe: "teks"; maks: number; bantuan?: string }
  | { k: string; label: string; tipe: "angka"; min: number; maks: number }
  | { k: string; label: string; tipe: "pilih"; opsi: [string, string][] }
  | { k: string; label: string; tipe: "centang" };

const JUDUL: Bidang = { k: "judul", label: "Judul bagian (kosong = bawaan)", tipe: "teks", maks: 80 };
/** Bidang pengaturan per widget (nilai tetap divalidasi ulang oleh skema di server). */
const BIDANG: Record<JenisWidget, Bidang[]> = {
  hero: [{ k: "tata", label: "Tata letak", tipe: "pilih", opsi: [["langit", "Langit + kartu putar 3D"], ["majalah", "Foto penuh + gradasi (Buku Tahunan)"], ["panel", "Foto besar + panel teks putih"], ["berdampingan", "Foto berdampingan dengan teks"], ["penuh", "Foto penuh dengan lapisan teks"]] }],
  pengumuman: [JUDUL, { k: "jumlah", label: "Jumlah pengumuman", tipe: "angka", min: 1, maks: 6 }],
  layanan: [JUDUL, { k: "jumlah", label: "Jumlah tautan", tipe: "angka", min: 2, maks: 8 }, { k: "tata", label: "Tata letak", tipe: "pilih", opsi: [["kisi", "Kisi dua kolom"], ["daftar", "Daftar"]] }],
  profil: [JUDUL, { k: "tata", label: "Posisi foto", tipe: "pilih", opsi: [["foto-kiri", "Foto di kiri"], ["foto-kanan", "Foto di kanan"]] }, { k: "paralaks", label: "Parallax ringan (hanya tingkat gerak Dinamis, desktop)", tipe: "centang" }],
  berita: [
    JUDUL,
    { k: "jumlah", label: "Jumlah berita", tipe: "angka", min: 1, maks: 7 },
    { k: "kategori", label: "Kategori (kosong = semua)", tipe: "teks", maks: 40, bantuan: "Mis. Prestasi — sama persis dengan kategori berita." },
    { k: "tata", label: "Tata letak", tipe: "pilih", opsi: [["utama-pendamping", "Satu berita utama + pendamping"], ["daftar", "Daftar judul"]] },
  ],
  agenda: [JUDUL, { k: "jumlah", label: "Jumlah agenda", tipe: "angka", min: 1, maks: 8 }],
  angka: [],
  spmb: [JUDUL],
  prestasi: [JUDUL, { k: "jumlah", label: "Jumlah prestasi", tipe: "angka", min: 2, maks: 8 }],
  program: [JUDUL, { k: "tata", label: "Tata letak", tipe: "pilih", opsi: [["sorot", "Sorotan bergulir dengan foto (desktop)"], ["daftar", "Daftar ringkas"]] }],
  galeri: [JUDUL, { k: "jumlah", label: "Jumlah foto", tipe: "angka", min: 3, maks: 8 }, { k: "tata", label: "Tata letak", tipe: "pilih", opsi: [["mozaik", "Mozaik (satu foto besar)"], ["kisi", "Kisi seragam"]] }, { k: "ekskul", label: "Tampilkan daftar ekskul", tipe: "centang" }],
  perpus: [JUDUL, { k: "rekomendasi", label: "Jumlah buku rekomendasi (0 = sembunyikan)", tipe: "angka", min: 0, maks: 6 }],
  kontak: [JUDUL, { k: "peta", label: "Tampilkan peta", tipe: "centang" }],
};

const kelasInput = "w-full rounded-lg border border-[#d9dce1] bg-white px-3 py-2 text-[15px] text-[#1f2328] focus:border-[var(--tema-utama)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--tema-utama)_20%,transparent)]";
const TAB = [
  ["tema", "Tema"],
  ["susunan", "Susunan beranda"],
  ["overlay", "Popup & pemandu"],
  ["riwayat", "Riwayat"],
] as const;
type Tab = (typeof TAB)[number][0];

function Pilihan({ nama, nilai, aktif, onPilih, children, mati }: { nama: string; nilai: string; aktif: boolean; onPilih: () => void; children: ReactNode; mati?: boolean }) {
  return (
    <label className={`block ${mati ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input type="radio" name={nama} value={nilai} checked={aktif} onChange={onPilih} disabled={mati} className="peer sr-only" />
      <span className="block h-full rounded-[10px] border border-[#d9dce1] bg-white p-3.5 transition-colors duration-150 hover:border-[#9aa1ab] peer-checked:border-2 peer-checked:border-[var(--tema-utama)] peer-checked:p-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--tema-utama)]">
        {children}
      </span>
    </label>
  );
}

export function EditorTampilan({ draf, terbit, riwayat, siap }: { draf: Konfigurasi; terbit: Konfigurasi; riwayat: Riwayat[]; siap: boolean }) {
  const [k, setK] = useState<Konfigurasi>(draf);
  const [tersimpan, setTersimpan] = useState(JSON.stringify(draf));
  const [tab, setTab] = useState<Tab>("tema");
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [buka, setBuka] = useState<string | null>(null);
  const [seret, setSeret] = useState<number | null>(null);
  const [pratinjau, setPratinjau] = useState<"desktop" | "ponsel" | null>(null);
  const [stamp, setStamp] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [proses, mulai] = useTransition();
  const tabRef = useRef<(HTMLButtonElement | null)[]>([]);

  const json = JSON.stringify(k);
  const belumDisimpan = json !== tersimpan;
  const belumTerbit = tersimpan !== JSON.stringify(terbit);
  const peringatan = useMemo(() => periksaKompatibilitas(k), [k]);
  const ubah = (f: (x: Konfigurasi) => Konfigurasi) => setK((x) => bacaKonfigurasi(f(x)));
  const ubahWidget = (id: string, f: (w: WidgetInstans) => WidgetInstans) => ubah((x) => ({ ...x, beranda: x.beranda.map((w) => (w.id === id ? f(w) : w)) }));

  // peringatan sebelum meninggalkan halaman dengan perubahan yang belum disimpan
  useEffect(() => {
    if (!belumDisimpan) return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [belumDisimpan]);

  const simpan = (lalu?: () => Promise<void> | void) =>
    mulai(async () => {
      const h = await simpanDrafTampilan(json);
      setPesan({ ok: h.ok, teks: h.pesan });
      if (h.ok) {
        setTersimpan(json);
        await lalu?.();
      }
    });
  const lihat = (alat: "desktop" | "ponsel") =>
    simpan(() => {
      setStamp(Date.now());
      setPratinjau(alat);
    });
  const terapkan = () =>
    simpan(async () => {
      const h = await terbitkanTampilan(catatan);
      setPesan({ ok: h.ok, teks: h.pesan });
      if (h.ok) {
        setCatatan("");
        window.setTimeout(() => window.location.reload(), 900);
      }
    });
  const pulihkan = (id: number) =>
    mulai(async () => {
      const h = await pulihkanTampilan(id);
      setPesan({ ok: h.ok, teks: h.pesan });
      if (h.ok) window.location.reload();
    });

  const tombolTab = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const ke = e.key === "ArrowRight" ? (i + 1) % TAB.length : e.key === "ArrowLeft" ? (i - 1 + TAB.length) % TAB.length : -1;
    if (ke < 0) return;
    e.preventDefault();
    setTab(TAB[ke][0]);
    tabRef.current[ke]?.focus();
  };

  if (!siap)
    return (
      <p className="rounded-[10px] bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        Penyimpanan tema belum tersedia. Jalankan migrasi <code>20261202000000_tampilan_widget.sql</code> di Supabase (uji di staging terlebih dahulu), lalu muat ulang halaman ini.
      </p>
    );

  return (
    <div>
      {/* bilah status & tindakan: Pratinjau → Sesuaikan → Terapkan */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 border-b border-[#e3e5e8] bg-[#f4f5f7]/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="mr-auto text-sm" role="status">
            {belumDisimpan ? (
              <span className="font-semibold text-[#8a4b00]">Ada perubahan yang belum disimpan</span>
            ) : belumTerbit ? (
              <span className="font-semibold text-[#8a4b00]">Draf tersimpan, belum diterapkan ke website</span>
            ) : (
              <span className="text-[#3b414b]">Draf sama dengan tampilan yang sedang tayang</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={proses} onClick={() => lihat("desktop")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d9dce1] bg-white px-3 text-sm font-semibold hover:border-[#9aa1ab] disabled:opacity-60">
              <Monitor size={16} aria-hidden /> Pratinjau desktop
            </button>
            <button type="button" disabled={proses} onClick={() => lihat("ponsel")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d9dce1] bg-white px-3 text-sm font-semibold hover:border-[#9aa1ab] disabled:opacity-60">
              <Smartphone size={16} aria-hidden /> Ponsel
            </button>
            <button type="button" disabled={proses || !belumDisimpan} onClick={() => simpan()} className="inline-flex min-h-10 items-center rounded-lg border border-[#1f2328] bg-white px-3 text-sm font-semibold disabled:opacity-50">
              {proses ? "Memproses…" : "Simpan draf"}
            </button>
          </div>
        </div>
        {pesan && (
          <p role={pesan.ok ? "status" : "alert"} className={`mt-2 text-sm font-medium ${pesan.ok ? "text-emerald-800" : "text-red-800"}`}>
            {pesan.teks}
          </p>
        )}
      </div>

      <div role="tablist" aria-label="Bagian pengaturan tampilan" className="mb-5 flex gap-1 overflow-x-auto border-b border-[#e3e5e8]">
        {TAB.map(([kunci, label], i) => (
          <button
            key={kunci}
            ref={(el) => {
              tabRef.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${kunci}`}
            aria-selected={tab === kunci}
            aria-controls={`panel-${kunci}`}
            tabIndex={tab === kunci ? 0 : -1}
            onClick={() => setTab(kunci)}
            onKeyDown={(e) => tombolTab(e, i)}
            className="relative shrink-0 px-3 py-2.5 text-sm font-semibold text-[#5b6270] hover:text-[#1f2328] aria-selected:text-[#1f2328] aria-selected:after:absolute aria-selected:after:inset-x-3 aria-selected:after:-bottom-px aria-selected:after:h-0.5 aria-selected:after:bg-[var(--tema-utama)]"
          >
            {label}
          </button>
        ))}
      </div>

      {peringatan.length > 0 && (
        <div className="mb-5 rounded-[10px] bg-[#fff8e8] px-4 py-3 text-sm text-[#5c3d00]" role="status">
          <p className="font-semibold">Perlu penyesuaian untuk tema ini</p>
          <ul className="mt-1 list-disc pl-5">
            {peringatan.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- TEMA ---------------- */}
      <section role="tabpanel" id="panel-tema" aria-labelledby="tab-tema" hidden={tab !== "tema"} className="space-y-7">
        <fieldset>
          <legend className="mb-2 font-semibold">Tema</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(TEMA) as KunciTema[]).map((t) => (
              <Pilihan key={t} nama="tema" nilai={t} aktif={k.tema === t} mati={!TEMA[t].tersedia} onPilih={() => ubah((x) => ({ ...x, tema: t as Konfigurasi["tema"] }))}>
                <span className="block font-semibold">{TEMA[t].label}</span>
                <span className="mt-1 block text-sm text-[#5b6270]">{TEMA[t].keterangan}</span>
                {TEMA[t].tersedia && k.tema !== t && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-[var(--tema-utama)] underline"
                    onClick={(e) => {
                      e.preventDefault();
                      const b = TEMA[t].bawaan;
                      ubah((x) => ({ ...x, tema: t as Konfigurasi["tema"], palet: b.palet, font: b.font, gerak: b.gerak }));
                    }}
                  >
                    Pakai dengan gaya bawaannya
                  </button>
                )}
              </Pilihan>
            ))}
          </div>
          <p className="mt-2 text-sm text-[#5b6270]">Susunan widget & isi tetap sama saat berganti tema. Dasbor admin tidak ikut berubah.</p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold">Warna aksen (dari logo sekolah)</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(PALET) as (keyof typeof PALET)[]).map((p) => (
              <Pilihan key={p} nama="palet" nilai={p} aktif={k.palet === p} onPilih={() => ubah((x) => ({ ...x, palet: p }))}>
                <span className="flex items-center gap-3">
                  <span aria-hidden className="h-8 w-8 shrink-0 rounded-md" style={{ background: PALET[p].utama }} />
                  <span className="font-semibold">{PALET[p].label}</span>
                </span>
              </Pilihan>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold">Huruf</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(FONT) as (keyof typeof FONT)[]).map((f) => (
              <Pilihan key={f} nama="font" nilai={f} aktif={k.font === f} onPilih={() => ubah((x) => ({ ...x, font: f }))}>
                <span className="block text-lg font-semibold" style={{ fontFamily: FONT[f].css }}>
                  SMA Negeri 22 Bandung
                </span>
                <span className="block text-sm text-[#5b6270]">{FONT[f].label}</span>
              </Pilihan>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold">Gerak</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(GERAK) as (keyof typeof GERAK)[]).map((g) => (
              <Pilihan key={g} nama="gerak" nilai={g} aktif={k.gerak === g} onPilih={() => ubah((x) => ({ ...x, gerak: g }))}>
                <span className="block font-semibold">{GERAK[g].label}</span>
                <span className="mt-1 block text-sm text-[#5b6270]">{GERAK[g].keterangan}</span>
              </Pilihan>
            ))}
          </div>
          <p className="mt-2 text-sm text-[#5b6270]">Pengunjung yang memilih “kurangi gerak” di perangkatnya selalu melihat versi tanpa animasi.</p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold">Slideshow pembuka</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Pilihan nama="slide" nilai="manual" aktif={k.slideshow.gaya === "manual"} onPilih={() => ubah((x) => ({ ...x, slideshow: { ...x.slideshow, gaya: "manual" } }))}>
              <span className="block font-semibold">Manual (disarankan)</span>
              <span className="mt-1 block text-sm text-[#5b6270]">Foto berganti hanya lewat tombol sebelumnya/berikutnya.</span>
            </Pilihan>
            <Pilihan nama="slide" nilai="otomatis" aktif={k.slideshow.gaya === "otomatis"} onPilih={() => ubah((x) => ({ ...x, slideshow: { ...x.slideshow, gaya: "otomatis" } }))}>
              <span className="block font-semibold">Otomatis</span>
              <span className="mt-1 block text-sm text-[#5b6270]">Ada tombol jeda; berhenti setelah pengunjung menekan kontrol.</span>
            </Pilihan>
          </div>
          {k.slideshow.gaya === "otomatis" && (
            <label className="mt-3 block max-w-xs text-sm font-semibold">
              Jeda antarfoto (detik, 7–15)
              <input
                type="number"
                min={7}
                max={15}
                value={k.slideshow.detik}
                onChange={(e) => ubah((x) => ({ ...x, slideshow: { ...x.slideshow, detik: Number(e.target.value) } }))}
                className={`${kelasInput} mt-1`}
              />
            </label>
          )}
        </fieldset>
      </section>

      {/* ---------------- SUSUNAN ---------------- */}
      <section role="tabpanel" id="panel-susunan" aria-labelledby="tab-susunan" hidden={tab !== "susunan"}>
        <p className="mb-3 text-sm text-[#5b6270]">
          Seret untuk mengurutkan, atau gunakan tombol naik/turun. Isi widget selalu diambil dari modul sumber (berita, pengumuman, galeri, katalog…); melepas widget tidak menghapus data apa pun.
        </p>
        <ol className="space-y-2">
          {k.beranda.map((w, i) => {
            const def = DEFINISI_WIDGET[w.jenis];
            const terbuka = buka === w.id;
            const judulKhusus = typeof w.pengaturan.judul === "string" && w.pengaturan.judul ? ` — “${w.pengaturan.judul}”` : "";
            return (
              <li
                key={w.id}
                draggable={!def.wajib}
                onDragStart={(e) => {
                  setSeret(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (seret !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (seret !== null) ubah((x) => ({ ...x, beranda: pindahkan(x.beranda, seret, i) }));
                  setSeret(null);
                }}
                onDragEnd={() => setSeret(null)}
                className={`rounded-[10px] border bg-white ${seret === i ? "border-[var(--tema-utama)] opacity-60" : "border-[#e3e5e8]"} ${w.tampil ? "" : "bg-[#f8f9fa]"}`}
              >
                <div className="flex flex-wrap items-center gap-2 p-2.5">
                  <span aria-hidden className={`grid h-9 w-6 place-items-center text-[#9aa1ab] ${def.wajib ? "invisible" : "cursor-grab"}`}>
                    <GripVertical size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${w.tampil ? "text-[#1f2328]" : "text-[#5b6270] line-through"}`}>
                      {i + 1}. {def.label}
                      {judulKhusus}
                    </span>
                    <span className="block text-xs text-[#5b6270]">
                      Sumber: {def.sumber}
                      {!w.tampil && " · disembunyikan"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" disabled={def.wajib || i <= 1} onClick={() => ubah((x) => ({ ...x, beranda: pindahkan(x.beranda, i, i - 1) }))} aria-label={`Naikkan ${def.label}`} className="grid h-9 w-9 place-items-center rounded-md hover:bg-[#f2f3f5] disabled:opacity-30">
                      <ArrowUp size={16} aria-hidden />
                    </button>
                    <button type="button" disabled={def.wajib || i === k.beranda.length - 1} onClick={() => ubah((x) => ({ ...x, beranda: pindahkan(x.beranda, i, i + 1) }))} aria-label={`Turunkan ${def.label}`} className="grid h-9 w-9 place-items-center rounded-md hover:bg-[#f2f3f5] disabled:opacity-30">
                      <ArrowDown size={16} aria-hidden />
                    </button>
                    {!def.wajib && (
                      <label className="ml-1 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm hover:bg-[#f2f3f5]">
                        <input type="checkbox" checked={w.tampil} onChange={(e) => ubahWidget(w.id, (x) => ({ ...x, tampil: e.target.checked }))} className="h-4 w-4 accent-[var(--tema-utama)]" />
                        Tampil
                      </label>
                    )}
                    <button type="button" onClick={() => setBuka(terbuka ? null : w.id)} aria-expanded={terbuka} aria-controls={`atur-${w.id}`} className="min-h-9 rounded-md px-2.5 text-sm font-semibold text-[var(--tema-utama)] hover:bg-[#f2f3f5]">
                      {terbuka ? "Tutup" : "Atur"}
                    </button>
                    {!def.wajib && (
                      <button type="button" onClick={() => ubah((x) => ({ ...x, beranda: lepasWidget(x.beranda, w.id) }))} aria-label={`Lepas ${def.label} dari beranda (data tidak dihapus)`} className="grid h-9 w-9 place-items-center rounded-md text-[#5b6270] hover:bg-red-50 hover:text-red-800">
                        <Trash2 size={16} aria-hidden />
                      </button>
                    )}
                  </span>
                </div>
                {terbuka && (
                  <div id={`atur-${w.id}`} className="grid gap-4 border-t border-[#eceef1] p-4 sm:grid-cols-2">
                    {BIDANG[w.jenis].map((b) => {
                      const id = `${w.id}-${b.k}`;
                      const nilai = w.pengaturan[b.k];
                      const set = (v: unknown) => ubahWidget(w.id, (x) => ({ ...x, pengaturan: { ...x.pengaturan, [b.k]: v } }));
                      if (b.tipe === "centang")
                        return (
                          <label key={id} className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                            <input type="checkbox" checked={nilai !== false} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-[var(--tema-utama)]" />
                            {b.label}
                          </label>
                        );
                      const dukung = b.k === "tata" ? TEMA[k.tema].tata[w.jenis] : undefined;
                      return (
                        <label key={id} htmlFor={id} className="block text-sm font-semibold">
                          {b.label}
                          {b.tipe === "pilih" ? (
                            <select id={id} value={String(nilai)} onChange={(e) => set(e.target.value)} className={`${kelasInput} mt-1`}>
                              {b.opsi.map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                  {dukung && !dukung.includes(v) ? " (tidak didukung tema ini)" : ""}
                                </option>
                              ))}
                            </select>
                          ) : b.tipe === "angka" ? (
                            <input id={id} type="number" min={b.min} max={b.maks} value={Number(nilai)} onChange={(e) => set(Number(e.target.value))} className={`${kelasInput} mt-1`} />
                          ) : (
                            <>
                              <input id={id} type="text" maxLength={b.maks} value={String(nilai ?? "")} onChange={(e) => set(e.target.value)} className={`${kelasInput} mt-1`} />
                              {b.bantuan && <span className="mt-1 block text-xs font-normal text-[#5b6270]">{b.bantuan}</span>}
                            </>
                          )}
                        </label>
                      );
                    })}
                    <p className="text-xs text-[#5b6270] sm:col-span-2">Bila data kosong: {def.kosong}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <TambahWidget daftar={k.beranda} onTambah={(j) => ubah((x) => ({ ...x, beranda: tambahWidget(x.beranda, j) }))} />
      </section>

      {/* ---------------- POPUP & PEMANDU ---------------- */}
      <section role="tabpanel" id="panel-overlay" aria-labelledby="tab-overlay" hidden={tab !== "overlay"} className="space-y-4">
        {[
          {
            label: "Modal pengumuman prioritas",
            teks: "Muncul sekali per sesi setelah bagian pembuka terlihat, hanya untuk pengumuman aktif yang ditandai “Tampilkan sebagai popup prioritas” (Admin → Pengumuman).",
            nilai: k.popup.prioritas,
            set: (v: boolean) => ubah((x) => ({ ...x, popup: { ...x.popup, prioritas: v } })),
          },
          {
            label: "Panel informasi rutin",
            teks: "Panel kecil di sudut setelah ±25% halaman (teaser di ponsel). Isinya pengumuman aktif & berita 14 hari terakhir. Tidak muncul otomatis bila modal prioritas sudah tampil.",
            nilai: k.popup.rutin,
            set: (v: boolean) => ubah((x) => ({ ...x, popup: { ...x.popup, rutin: v } })),
          },
          {
            label: "Pemandu bantuan",
            teks: "Tombol bantuan berbasis pilihan (calon murid, siswa, orang tua, guru, pengunjung). Melambai sekali saat tidak ada popup lain; pengunjung dapat menyembunyikannya.",
            nilai: k.pemandu.aktif,
            set: (v: boolean) => ubah((x) => ({ ...x, pemandu: { aktif: v } })),
          },
        ].map((o) => (
          <label key={o.label} className="flex cursor-pointer gap-3 rounded-[10px] border border-[#e3e5e8] bg-white p-4">
            <input type="checkbox" checked={o.nilai} onChange={(e) => o.set(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--tema-utama)]" />
            <span>
              <span className="block font-semibold">{o.label}</span>
              <span className="mt-0.5 block text-sm text-[#5b6270]">{o.teks}</span>
            </span>
          </label>
        ))}
        <p className="text-sm text-[#5b6270]">Ketiganya diatur satu pengatur sehingga tidak pernah tampil bersamaan. Tanpa data, tidak ada popup yang muncul.</p>
      </section>

      {/* ---------------- RIWAYAT ---------------- */}
      <section role="tabpanel" id="panel-riwayat" aria-labelledby="tab-riwayat" hidden={tab !== "riwayat"}>
        <p className="mb-3 text-sm text-[#5b6270]">
          Setiap kali diterapkan, konfigurasi dicatat di sini. Memulihkan menyalin versi itu ke draf — periksa pratinjau, lalu Terapkan.{" "}
          <a href="/pratinjau/tampilan?versi=terbit" target="_blank" rel="noopener" className="font-semibold underline">
            Lihat versi yang sedang tayang
          </a>
        </p>
        {riwayat.length ? (
          <ul className="divide-y divide-[#eceef1] rounded-[10px] border border-[#e3e5e8] bg-white">
            {riwayat.map((r, i) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {r.waktu}
                    {i === 0 && <span className="ml-2 rounded bg-emerald-50 px-1.5 text-xs text-emerald-800">sedang tayang</span>}
                  </span>
                  <span className="block text-sm text-[#5b6270]">
                    {r.catatan || "Tanpa catatan"} · {r.oleh}
                  </span>
                </span>
                <button type="button" disabled={proses} onClick={() => pulihkan(r.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d9dce1] px-3 text-sm font-semibold hover:border-[#9aa1ab] disabled:opacity-50">
                  <RotateCcw size={15} aria-hidden /> Pulihkan ke draf
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[10px] border border-dashed border-[#d9dce1] bg-white px-4 py-3 text-sm text-[#3b414b]">Belum ada versi yang diterapkan. Tampilan saat ini memakai pengaturan bawaan.</p>
        )}
      </section>

      {/* ---------------- TERAPKAN ---------------- */}
      <div className="mt-8 rounded-[10px] border border-[#e3e5e8] bg-white p-4">
        <h2 className="font-semibold">Terapkan ke website</h2>
        <p className="mt-1 text-sm text-[#5b6270]">Draf disimpan otomatis lalu diterbitkan. Versi sebelumnya tetap bisa dipulihkan dari Riwayat.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-sm font-semibold">
            Catatan perubahan (opsional)
            <input type="text" maxLength={200} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="contoh: ganti ke tema Modern untuk SPMB" className={`${kelasInput} mt-1`} />
          </label>
          <button type="button" disabled={proses || (!belumDisimpan && !belumTerbit)} onClick={terapkan} className="inline-flex min-h-10 items-center rounded-lg bg-[var(--tema-utama)] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50">
            {proses ? "Memproses…" : "Terapkan"}
          </button>
        </div>
      </div>

      {pratinjau && <PratinjauPerangkat alat={pratinjau} stamp={stamp} onAlat={setPratinjau} onTutup={() => setPratinjau(null)} />}
    </div>
  );
}

function TambahWidget({ daftar, onTambah }: { daftar: WidgetInstans[]; onTambah: (j: JenisWidget) => void }) {
  const tersedia = JENIS_WIDGET.filter((j) => bolehTambah(daftar, j));
  const [pilih, setPilih] = useState<JenisWidget | "">("");
  if (!tersedia.length) return <p className="mt-4 text-sm text-[#5b6270]">Semua widget sudah ada di beranda.</p>;
  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <label className="text-sm font-semibold">
        Tambah widget
        <select value={pilih} onChange={(e) => setPilih(e.target.value as JenisWidget)} className={`${kelasInput} mt-1 min-w-[240px]`}>
          <option value="">Pilih widget…</option>
          {tersedia.map((j) => (
            <option key={j} value={j}>
              {DEFINISI_WIDGET[j].label}
              {DEFINISI_WIDGET[j].instans === "banyak" ? " (boleh lebih dari satu)" : ""}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!pilih}
        onClick={() => {
          if (pilih) onTambah(pilih);
          setPilih("");
        }}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#1f2328] bg-white px-3 text-sm font-semibold disabled:opacity-50"
      >
        <Plus size={16} aria-hidden /> Tambah
      </button>
    </div>
  );
}

/** Pratinjau desktop/ponsel dalam bingkai (draf dirender server di /pratinjau/tampilan, hanya untuk pengelola). */
function PratinjauPerangkat({ alat, stamp, onAlat, onTutup }: { alat: "desktop" | "ponsel"; stamp: number; onAlat: (a: "desktop" | "ponsel") => void; onTutup: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const wadah = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(1);
  const lebar = alat === "desktop" ? 1280 : 390;
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ukur = () => setSkala(Math.min(1, (el.clientWidth - 16) / lebar));
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lebar]);
  return (
    <dialog ref={ref} onClose={onTutup} aria-label="Pratinjau tampilan" className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#e9ebef] p-0 backdrop:bg-black/40">
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#d9dce1] bg-white px-4 py-2">
          <Eye size={18} aria-hidden className="text-[#5b6270]" />
          <p className="mr-auto text-sm font-semibold">Pratinjau draf · {alat === "desktop" ? "Desktop 1280px" : "Ponsel 390px"}</p>
          <button type="button" onClick={() => onAlat("desktop")} aria-pressed={alat === "desktop"} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold aria-pressed:bg-[#eceef1]">
            <Monitor size={16} aria-hidden /> Desktop
          </button>
          <button type="button" onClick={() => onAlat("ponsel")} aria-pressed={alat === "ponsel"} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold aria-pressed:bg-[#eceef1]">
            <Smartphone size={16} aria-hidden /> Ponsel
          </button>
          <a href="/pratinjau/tampilan" target="_blank" rel="noopener" className="min-h-9 rounded-md px-2.5 py-2 text-sm font-semibold underline">
            Buka di tab baru
          </a>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Tutup pratinjau" className="grid h-9 w-9 place-items-center rounded-md hover:bg-[#f2f3f5]">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div ref={wadah} className="min-h-0 flex-1 overflow-auto p-2">
          <div style={{ width: lebar * skala, height: `calc((100dvh - 80px))`, margin: "0 auto" }}>
            <iframe
              key={`${alat}-${stamp}`}
              title="Pratinjau beranda (draf)"
              src={`/pratinjau/tampilan?t=${stamp}`}
              style={{ width: lebar, height: `calc((100dvh - 80px) / ${skala})`, transform: `scale(${skala})`, transformOrigin: "0 0" }}
              className="rounded-md border border-[#d9dce1] bg-white"
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}
