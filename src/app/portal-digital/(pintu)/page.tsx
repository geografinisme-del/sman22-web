import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { MediaSlot } from "@/components/MediaSlot";
import { PageHero, SectionHeading } from "@/components/langit/Komponen";
import { getAkses, labelPeran } from "@/lib/admin/auth";
import { BIDANG } from "@/lib/bidang";
import { getFotoPortal, getPortalBidang, type PenanggungJawab, type PeranFoto } from "@/lib/data";
import { alamatMasuk, cocokHalaman, lanjutAman, type PeranMasuk } from "@/lib/masuk";
import { GRUP, pintuTerlihat, type Pintu } from "@/lib/portal-digital";
import { keluar } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

/** Tiga pintu utama: teks resmi + halaman masuk per peran (foto dari CMS portal_login, sama dengan halaman masuk). */
const PINTU: { peran: PeranMasuk; foto: PeranFoto; judul: string; teks: string }[] = [
  { peran: "gtk", foto: "gtk", judul: "Guru dan Tenaga Kependidikan", teks: "Untuk guru, manajemen sekolah, TU, pustakawan, laboran, satpam, caraka, dan pegawai lainnya." },
  { peran: "siswa", foto: "siswa", judul: "Siswa", teks: "Portal Siswa, E-Learning, dan E-Library." },
  { peran: "orang-tua", foto: "orang_tua", judul: "Orang Tua", teks: "Pantau perkembangan dan informasi anak." },
];

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
export default async function PortalDigital({ searchParams }: { searchParams: Promise<{ lanjut?: string }> }) {
  const [{ user, akses }, pj, foto, sp] = await Promise.all([getAkses(), getPortalBidang(), getFotoPortal(), searchParams]);
  const lanjut = lanjutAman(sp.lanjut);
  const peranSaya = akses ? [...akses.peran, ...akses.peranTertunda] : [];
  const keMasuk = (p: PeranMasuk) => (lanjut ? `${alamatMasuk(p)}?lanjut=${encodeURIComponent(lanjut)}` : alamatMasuk(p));
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
            {orang?.foto ? <MediaSlot src={orang.foto} alt="" ratio="isi" sizes="48px" isPlaceholder={false} className="absolute inset-0" /> : inisial(b.label)}
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
            {PINTU.map((d) => {
              const f = foto[d.foto];
              const punya = Boolean(user && cocokHalaman(d.peran, peranSaya));
              return (
                <li key={d.peran}>
                  <Link href={keMasuk(d.peran)}>
                    <MediaSlot src={f.src} alt={f.alt} focus={f.fokus} isPlaceholder={f.sementara} ratio="4/3" sizes="(min-width: 768px) 33vw, 100vw" priority />
                    <h3>
                      {d.judul}
                      {punya && <span className="pd-status">Akses Anda</span>}
                    </h3>
                    <p>{d.teks}</p>
                    <span className="pd-masuk">
                      {punya ? "Buka" : "Masuk"}
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
