import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { IkonBidang } from "@/components/IkonBidang";
import { getAkses, labelPeran } from "@/lib/admin/auth";
import { BIDANG } from "@/lib/bidang";
import { GRUP, pintuTerlihat, type Grup, type Pintu } from "@/lib/portal-digital";
import { keluar } from "../admin/actions";

export const dynamic = "force-dynamic";

/**
 * Portal Digital 22: semua pintu layanan terlihat sebelum masuk (nama + fungsi, tanpa data internal).
 * Kartu "masuk" mengarah ke /portal-digital/buka/<bidang> yang memutuskan di server: login bersama,
 * buka ruang kerja, atau penjelasan akses. Kartu tidak pernah memberi hak.
 */
export default async function PortalDigital() {
  const { user, akses } = await getAkses();
  const pintu = pintuTerlihat(akses);
  const urutGrup: Grup[] = ["warga", "manajemen", "belajar", "sistem"];
  const hanyaPortal = akses ? akses.peran.every((p) => p === "siswa" || p === "orang_tua") : false;

  const kartu = (p: Pintu) => {
    const b = BIDANG[p.bidang];
    const milik = p.jenis === "masuk" && akses && p.boleh?.(akses);
    return (
      <li key={p.bidang}>
        <Link href={p.jenis === "publik" ? p.href : `/portal-digital/buka/${p.bidang}`} className="pd-pintu" data-bidang={p.bidang}>
          <span className="pd-ikon">
            <IkonBidang bidang={p.bidang} size={22} />
          </span>
          <h3>
            {b.label}
            {milik && <span className="pd-status">Akses Anda</span>}
          </h3>
          <p>{b.keterangan}</p>
          <span className="pd-aksi">
            {p.jenis === "masuk" && !user ? "Masuk" : p.tindakan}
            <ArrowRight size={16} aria-hidden />
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <section className="pd-pembuka" aria-labelledby="judul-pd">
        <div className="pd-wadah pd-pembuka-grid">
          <div>
            <p className="pd-label">SMA Negeri 22 Bandung</p>
            <h1 id="judul-pd">
              Portal Digital <span>22</span>
            </h1>
            <p className="pd-ket">Satu pintu menuju layanan sekolah: ruang kerja guru dan manajemen, portal siswa dan orang tua, serta E-Library. Satu akun untuk semuanya.</p>
            <div className="pd-pita" aria-hidden>
              {pintu.map((p) => (
                <span key={p.bidang} data-bidang={p.bidang} />
              ))}
            </div>
            {user && (
              <div className="pd-akun" role="status">
                <span>
                  Masuk sebagai <strong>{akses?.nama || user.email}</strong>
                  {akses?.peran.length ? <span className="text-[#5b6270]"> · {labelPeran(akses.peran)}</span> : null}
                </span>
                <Link href={hanyaPortal ? "/portal" : "/admin/mulai"} className="font-semibold text-[var(--tema-utama)] underline underline-offset-4">
                  Ruang kerja saya
                </Link>
                <form action={keluar} className="ml-auto">
                  <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#3b414b] hover:underline">
                    <LogOut size={15} aria-hidden /> Keluar
                  </button>
                </form>
              </div>
            )}
          </div>
          <figure className="pd-foto">
            <Image src="/images/kegiatan-aula.jpg" alt="Siswa SMA Negeri 22 Bandung mengikuti kegiatan di aula" fill priority sizes="(min-width: 900px) 45vw, 100vw" className="object-cover" style={{ objectPosition: "50% 40%" }} />
            <figcaption>Kegiatan siswa di aula sekolah</figcaption>
          </figure>
        </div>
      </section>

      <div className="pd-wadah">
        {urutGrup.map((g) => {
          const isi = pintu.filter((p) => p.grup === g);
          if (!isi.length) return null;
          return (
            <section key={g} className="pd-grup" aria-labelledby={`grup-${g}`}>
              <div className="pd-grup-kepala">
                <h2 id={`grup-${g}`}>{GRUP[g].judul}</h2>
                <p>{GRUP[g].keterangan}</p>
              </div>
              <ul className={`pd-kisi ${g === "warga" ? "pd-kisi-utama" : ""}`} data-muncul="kelompok">
                {isi.map(kartu)}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
