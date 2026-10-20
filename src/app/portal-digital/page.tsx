import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { MediaSlot } from "@/components/MediaSlot";
import { PageHero, SectionHeading } from "@/components/langit/Komponen";
import { getAkses, labelPeran } from "@/lib/admin/auth";
import { BIDANG, type KunciBidang } from "@/lib/bidang";
import { getPortalBidang, type PenanggungJawab } from "@/lib/data";
import { GRUP, pintuTerlihat, type Pintu } from "@/lib/portal-digital";
import { keluar } from "../admin/actions";

export const dynamic = "force-dynamic";

/** Foto pengisi kartu peran: foto asli sekolah (bukan stok). */
const FOTO_PERAN: Partial<Record<KunciBidang, { src: string; alt: string; fokus?: string }>> = {
  guru: { src: "/images/kegiatan-aula.jpg", alt: "Guru dan siswa dalam kegiatan di aula sekolah", fokus: "50% 40%" },
  siswa: { src: "/images/apel-lapangan.jpg", alt: "Siswa mengikuti apel di lapangan sekolah", fokus: "50% 45%" },
  ortu: { src: "/images/gedung.jpg", alt: "Gedung SMA Negeri 22 Bandung", fokus: "50% 50%" },
};

/** Inisial bidang: dua kata pertama → huruf awal ("Tata Usaha" → "TU"); satu kata → dua huruf awal ("Humas" → "HU"). */
function inisial(label: string) {
  const kata = label.split(/[^A-Za-z]+/).filter(Boolean);
  if (kata.length >= 2) return (kata[0][0] + kata[1][0]).toUpperCase();
  const k = kata[0] ?? "";
  return k.slice(0, 2).toUpperCase();
}

/**
 * Portal Digital 22: semua pintu layanan terlihat sebelum masuk (nama + fungsi, tanpa data internal).
 * Tautan "masuk" mengarah ke /portal-digital/buka/<bidang> yang memutuskan di server: login bersama,
 * buka ruang kerja, atau penjelasan akses. Kartu tidak pernah memberi hak.
 */
export default async function PortalDigital() {
  const [{ user, akses }, pj] = await Promise.all([getAkses(), getPortalBidang()]);
  const pintu = pintuTerlihat(akses);
  const hanyaPortal = akses ? akses.peran.every((p) => p === "siswa" || p === "orang_tua") : false;
  const dari = (g: string) => pintu.filter((p) => p.grup === g);
  const href = (p: Pintu) => (p.jenis === "publik" ? p.href : `/portal-digital/buka/${p.bidang}`);
  const milik = (p: Pintu) => Boolean(p.jenis === "masuk" && akses && p.boleh?.(akses));

  const baris = (p: Pintu, orang?: PenanggungJawab) => {
    const b = BIDANG[p.bidang];
    return (
      <li key={p.bidang}>
        <Link href={href(p)} className="pd-baris">
          <span className="pd-inisial" aria-hidden>
            {orang?.foto ? <Image src={orang.foto} alt="" fill sizes="48px" className="object-cover" /> : inisial(b.label)}
          </span>
          <span className="min-w-0">
            <strong>
              {b.label}
              {milik(p) && <span className="pd-status">Akses Anda</span>}
            </strong>
            <small>{b.keterangan}</small>
            {orang?.penanggungJawab && <small className="pd-pj">Penanggung jawab: {orang.penanggungJawab}</small>}
          </span>
          <ArrowRight size={18} className="pd-panah" aria-hidden />
        </Link>
      </li>
    );
  };

  const manajemen = [...dari("manajemen"), ...dari("sistem")];
  const umum = dari("belajar");

  return (
    <>
      <PageHero judul="Portal Digital 22" label="Satu akun untuk semua layanan" deskripsi="Pintu masuk layanan digital SMA Negeri 22 Bandung: ruang kerja guru dan manajemen, portal siswa dan orang tua, serta E-Library." />
      <section className="lgt-bagian" aria-labelledby="judul-peran">
        <div className="lgt-wadah">
          {user && (
            <div className="pd-akun" role="status">
              <span>
                Masuk sebagai <strong>{akses?.nama || user.email}</strong>
                {akses?.peran.length ? <span className="text-[var(--muted)]"> · {labelPeran(akses.peran)}</span> : null}
              </span>
              <Link href={hanyaPortal ? "/portal" : "/admin/mulai"} className="lgt-tautan-panah">
                Ruang kerja saya <span aria-hidden>→</span>
              </Link>
              <form action={keluar} className="ml-auto">
                <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-bold hover:underline">
                  <LogOut size={15} aria-hidden /> Keluar
                </button>
              </form>
            </div>
          )}

          <SectionHeading id="judul-peran" label="Masuk sesuai peran" judul="Pilih pintu Anda." />
          <ul className="pd-peran mt-8">
            {dari("warga").map((p) => {
              const b = BIDANG[p.bidang];
              const f = FOTO_PERAN[p.bidang];
              return (
                <li key={p.bidang}>
                  <Link href={href(p)}>
                    <MediaSlot src={f?.src} alt={f?.alt ?? ""} fokus={f?.fokus} ratio="4/3" sizes="(min-width: 768px) 33vw, 100vw" priority />
                    <h3>
                      {b.label}
                      {milik(p) && <span className="pd-status">Akses Anda</span>}
                    </h3>
                    <p>{b.keterangan}</p>
                    <span className="pd-masuk">
                      {!user ? "Masuk" : p.tindakan}
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {manajemen.length > 0 && (
        <section className="lgt-bagian lgt-bagian-soft" aria-labelledby="judul-manajemen">
          <div className="lgt-wadah">
            <SectionHeading id="judul-manajemen" label="Ruang kerja" judul={GRUP.manajemen.judul} teks={GRUP.manajemen.keterangan} />
            <ul className="pd-daftar">{manajemen.map((p) => baris(p, pj[p.bidang]))}</ul>
          </div>
        </section>
      )}

      {umum.length > 0 && (
        <section className="lgt-bagian" aria-labelledby="judul-umum">
          <div className="lgt-wadah">
            <SectionHeading id="judul-umum" label="Layanan publik" judul="Terbuka untuk umum." />
            <ul className="pd-daftar">
              {umum.map((p) => {
                const b = BIDANG[p.bidang];
                return (
                  <li key={p.bidang}>
                    <Link href={p.href} className="pd-baris">
                      <span className="min-w-0">
                        <strong>{b.label}</strong>
                        <small>{b.keterangan}</small>
                      </span>
                      <span className="pd-tindakan">{p.tindakan} →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
      <p className="lgt-wadah pb-12 text-sm text-[var(--muted)]">Hak akses setiap bidang diatur oleh admin sekolah. Memilih layanan tidak menambah hak akses.</p>
    </>
  );
}
