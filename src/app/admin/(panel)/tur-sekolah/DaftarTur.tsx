"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Video } from "lucide-react";
import { FormAksi, TombolSimpan } from "@/components/admin/form";
import { Lencana } from "@/components/admin/ui";
import { aturAktifTitikTur, urutkanTitikTur } from "../../actions-tur";

export type ItemTur = { id: string; label: string; judul: string; aktif: boolean; gambar: string; tipe: "foto" | "video"; sementara: boolean };

/**
 * Daftar titik tur: seret-lepas untuk mengurutkan (juga tombol naik/turun untuk keyboard), pratinjau kecil,
 * dan tombol aktif/nonaktif (batas 3–8 titik aktif dijaga server). Urutan disimpan dengan tombol "Simpan urutan".
 */
export function DaftarTur({ awal }: { awal: ItemTur[] }) {
  const [daftar, setDaftar] = useState(awal);
  const [seret, setSeret] = useState<number | null>(null);
  const berubah = daftar.map((x) => x.id).join() !== awal.map((x) => x.id).join();
  const aktif = daftar.filter((x) => x.aktif).length;

  const pindah = (dari: number, ke: number) => {
    if (ke < 0 || ke >= daftar.length || dari === ke) return;
    const baru = [...daftar];
    const [x] = baru.splice(dari, 1);
    baru.splice(ke, 0, x);
    setDaftar(baru);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-black/60">
        {aktif} dari maksimal 8 titik aktif (minimal 3). Seret <GripVertical size={14} className="inline" aria-hidden /> atau pakai tombol panah untuk mengubah urutan.
      </p>
      <ol className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {daftar.map((t, i) => (
          <li
            key={t.id}
            draggable
            onDragStart={() => setSeret(i)}
            onDragOver={(e) => {
              e.preventDefault();
              if (seret !== null && seret !== i) {
                pindah(seret, i);
                setSeret(i);
              }
            }}
            onDragEnd={() => setSeret(null)}
            className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${seret === i ? "bg-[var(--soft)]" : ""}`}
          >
            <span className="hidden cursor-grab text-black/40 sm:block" aria-hidden>
              <GripVertical size={18} />
            </span>
            <span className="relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[var(--sky-1)] to-[var(--sky-3)] text-white">
              {t.gambar ? <Image src={t.gambar} alt="" fill sizes="96px" className="object-cover" /> : <span className="text-xl font-extrabold opacity-70">22</span>}
              {t.tipe === "video" && <Video size={16} className="absolute bottom-1 right-1 drop-shadow" aria-label="video" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                <span className="font-mono text-xs text-black/40">{String(i).padStart(2, "0")}</span>
                {t.judul}
                <Lencana>{t.label}</Lencana>
                {!t.aktif && <Lencana>Nonaktif</Lencana>}
                {t.sementara && <Lencana warna="kuning">Contoh / ilustrasi sementara</Lencana>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" onClick={() => pindah(i, i - 1)} disabled={i === 0} aria-label={`Naikkan ${t.judul}`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30">
                <ArrowUp size={16} aria-hidden />
              </button>
              <button type="button" onClick={() => pindah(i, i + 1)} disabled={i === daftar.length - 1} aria-label={`Turunkan ${t.judul}`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30">
                <ArrowDown size={16} aria-hidden />
              </button>
              <form action={aturAktifTitikTur}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="aktif" value={t.aktif ? "0" : "1"} />
                <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  {t.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </form>
              <Link href={`/admin/tur-sekolah?ubah=${t.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                Ubah
              </Link>
            </div>
          </li>
        ))}
      </ol>
      {/* selalu dirender agar pesan "Urutan … disimpan" tetap terlihat setelah menyimpan */}
      <FormAksi aksi={urutkanTitikTur} className="mt-3 flex flex-wrap items-center gap-3">
        <input type="hidden" name="urutan" value={JSON.stringify(daftar.map((x) => x.id))} />
        <fieldset disabled={!berubah} className="contents">
          <TombolSimpan>Simpan urutan</TombolSimpan>
        </fieldset>
        {berubah && (
          <button type="button" onClick={() => setDaftar(awal)} className="text-sm text-black/60 hover:underline">
            Batalkan
          </button>
        )}
      </FormAksi>
    </div>
  );
}
