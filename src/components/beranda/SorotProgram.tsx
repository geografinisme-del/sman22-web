"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

export type FotoProgram = { src: string; alt: string; keterangan: string };
export type ItemProgram = { kode: string; nama: string; ringkas: string; href: string; tautan: string; isi?: ReactNode; foto?: FotoProgram };

/** Desktop dengan tinggi layar memadai: foto menempel & berganti mengikuti program yang sedang dibaca. */
const KUERI = "(min-width: 1024px) and (min-height: 680px)";
const langganan = (cb: () => void) => {
  const mq = window.matchMedia(KUERI);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Bagian khas beranda "Program dan pembiasaan karakter".
 * Desktop: foto dokumentasi (tinggi terbatas) menempel di samping daftar program; program yang
 * masuk area baca disorot dan fotonya berganti dengan crossfade. Sticky hanya di dalam bagian ini,
 * scroll tetap native. Ponsel/layar pendek: susunan vertikal biasa, foto program tampil di tempatnya.
 * Isi setiap program selalu ada di alur halaman (tidak bergantung hover atau JS).
 */
export function SorotProgram({ item, fotoUmum }: { item: ItemProgram[]; fotoUmum: FotoProgram }) {
  const hidup = useSyncExternalStore(langganan, () => window.matchMedia(KUERI).matches, () => false);
  const [aktif, setAktif] = useState(0);
  const daftar = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ol = daftar.current;
    if (!hidup || !ol) return;
    // pita baca di tengah layar: program yang melintasinya menjadi sorotan
    const io = new IntersectionObserver(
      (entri) => {
        for (const e of entri) if (e.isIntersecting) setAktif(Number((e.target as HTMLElement).dataset.indeks));
      },
      { rootMargin: "-42% 0px -48% 0px" },
    );
    ol.querySelectorAll("[data-indeks]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [hidup]);

  const indeks = hidup ? aktif : 0;
  const fotoAktif = item[indeks]?.foto ?? fotoUmum;
  const semuaFoto = [...new Map([...item.flatMap((p) => (p.foto ? [p.foto] : [])), fotoUmum].map((f) => [f.src, f])).values()];

  return (
    <div className="sorot">
      <figure className="sorot-media">
        <div className="foto sorot-bingkai" data-muncul="foto">
          {semuaFoto.map((f) => (
            <Image
              key={f.src}
              src={f.src}
              alt={f.src === fotoAktif.src ? f.alt : ""}
              aria-hidden={f.src !== fotoAktif.src || undefined}
              fill
              sizes="(min-width: 1024px) 40vw, 1px"
              className="object-cover"
              data-aktif={f.src === fotoAktif.src || undefined}
            />
          ))}
        </div>
        <figcaption className="keterangan-foto">{fotoAktif.keterangan}</figcaption>
      </figure>

      <ol ref={daftar} className="sorot-daftar">
        {item.map((p, i) => (
          <li key={p.kode} data-indeks={i} data-aktif={(hidup && i === aktif) || undefined} className="sorot-item" data-muncul>
            <span className="sorot-nomor" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3>{p.nama}</h3>
              <p className="mt-1.5 text-[#3b414b]">{p.ringkas}</p>
              {p.foto && (
                <figure className="sorot-foto-hp">
                  <div className="foto relative aspect-[4/3]">
                    <Image src={p.foto.src} alt={p.foto.alt} fill sizes="(min-width: 1024px) 1px, 100vw" className="object-cover" />
                  </div>
                  <figcaption className="keterangan-foto">{p.foto.keterangan}</figcaption>
                </figure>
              )}
              {p.isi && <div className="mt-4">{p.isi}</div>}
              <Link href={p.href} className="tautan mt-4 inline-block">
                {p.tautan}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
