import Image from "next/image";
import Link from "next/link";

export type FotoPita = { id: string; judul: string; gambar: string };

/** Dua baris foto yang mengalir berlawanan arah (berhenti saat disentuh/di-hover). */
export function PitaFoto({ foto }: { foto: FotoPita[] }) {
  if (foto.length < 4) return null;
  const tengah = Math.ceil(foto.length / 2);
  const baris = [foto.slice(0, tengah), foto.slice(tengah)];
  return (
    <section aria-label="Sekilas kegiatan sekolah" className="pita overflow-hidden py-10 sm:py-16">
      {baris.map((isi, b) => (
        <div key={b} className={`flex w-max gap-4 ${b ? "mt-4" : ""} marquee ${b ? "marquee-balik" : ""}`} style={{ animationDuration: `${isi.length * 7}s` }}>
          {[0, 1].map((salinan) =>
            isi.map((f, i) => (
              <Link
                key={`${salinan}-${f.id}`}
                href="/galeri"
                tabIndex={salinan ? -1 : undefined}
                aria-hidden={salinan === 1}
                className={`group relative block h-44 shrink-0 overflow-hidden rounded-[1.25rem] bg-brand-900 sm:h-60 ${i % 3 === 1 ? "w-56 sm:w-72" : "w-72 sm:w-96"}`}
              >
                <Image src={f.gambar} alt={salinan ? "" : f.judul} fill sizes="384px" className="object-cover transition duration-700 ease-out group-hover:scale-110" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                <span className="absolute inset-x-0 bottom-0 translate-y-3 p-4 text-sm font-medium text-white opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  {f.judul}
                </span>
              </Link>
            )),
          )}
        </div>
      ))}
    </section>
  );
}
