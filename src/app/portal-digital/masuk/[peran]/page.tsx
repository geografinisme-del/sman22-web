import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormMasuk } from "@/components/akun/FormMasuk";
import { HalamanMasuk } from "@/components/akun/HalamanMasuk";
import { getAkses } from "@/lib/admin/auth";
import { getBantuanSandi, getFotoPortal } from "@/lib/data";
import { alamatMasuk, cocokHalaman, dasborPeran, LABEL_PERAN_MASUK, lanjutAman, PERAN_MASUK, peranAkun, type PeranMasuk } from "@/lib/masuk";
import { supabaseAktif } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const TEKS: Record<PeranMasuk, { label: string; judul: string; tab: string; pengantar: string; foto: "gtk" | "siswa" | "orang_tua" }> = {
  gtk: {
    label: "Guru & Tendik",
    judul: "Masuk sebagai Guru & Tendik",
    tab: "Masuk Guru & Tendik",
    pengantar: "Untuk guru, manajemen sekolah, TU, pustakawan, laboran, satpam, caraka, dan pegawai lainnya.",
    foto: "gtk",
  },
  siswa: {
    label: "Portal Siswa",
    judul: "Masuk ke Portal Siswa",
    tab: "Masuk Portal Siswa",
    pengantar: "Portal Siswa, E-Learning, dan E-Library.",
    foto: "siswa",
  },
  "orang-tua": {
    label: "Portal Orang Tua",
    judul: "Masuk ke Portal Orang Tua",
    tab: "Masuk Portal Orang Tua",
    pengantar: "Pantau perkembangan dan informasi anak.",
    foto: "orang_tua",
  },
};

type Props = { params: Promise<{ peran: string }>; searchParams: Promise<{ lanjut?: string; pesan?: string }> };
const valid = (p: string): p is PeranMasuk => (PERAN_MASUK as string[]).includes(p);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { peran } = await params;
  if (!valid(peran)) return {};
  return { title: TEKS[peran].tab, robots: { index: false, follow: false } };
}

/**
 * Halaman masuk per peran: /portal-digital/masuk/gtk | /siswa | /orang-tua. Peran ditentukan halaman ini;
 * cara masuk tetap seperti sebelumnya. Akun yang tidak cocok mendapat pesan + tautan ke halaman yang benar.
 */
export default async function MasukPeran({ params, searchParams }: Props) {
  const [{ peran }, { lanjut: lanjutMentah, pesan }] = await Promise.all([params, searchParams]);
  if (!valid(peran)) notFound();
  const lanjut = lanjutAman(lanjutMentah) ?? undefined;
  const t = TEKS[peran];

  // sudah masuk dengan akun yang cocok → langsung ke tujuan / dasbor perannya
  const { user, akses } = await getAkses();
  const peranSaya = akses ? [...akses.peran, ...akses.peranTertunda] : [];
  if (user && akses && cocokHalaman(peran, peranSaya)) redirect(lanjut ?? dasborPeran(peranSaya));
  const sedangMasukLain = user && akses ? peranAkun(peranSaya) : null;

  const [foto, bantuanSandi] = await Promise.all([getFotoPortal(), getBantuanSandi()]);
  // datang dari area alumni (sementara masuk lewat halaman Guru & Tendik; jalur alumni terpisah menyusul)
  const dariAlumni = peran === "gtk" && Boolean(lanjut?.startsWith("/alumni"));
  const lain = PERAN_MASUK.filter((p) => p !== peran);
  const kecil = (p: PeranMasuk) => (p === "gtk" ? "guru & tendik" : LABEL_PERAN_MASUK[p].pendek.toLowerCase());
  const keLain = (p: PeranMasuk) => (lanjut ? `${alamatMasuk(p)}?lanjut=${encodeURIComponent(lanjut)}` : alamatMasuk(p));

  return (
    <HalamanMasuk
      foto={foto[t.foto]}
      label={t.label}
      judul={t.judul}
      pengantar={<p>{t.pengantar}</p>}
      bawah={
        <>
          <p>
            <strong>Lupa kata sandi?</strong> {bantuanSandi[t.foto]}
          </p>
          <p>
            Bukan {peran === "gtk" ? "Guru & Tendik" : LABEL_PERAN_MASUK[peran].pendek.toLowerCase()}? Masuk sebagai{" "}
            {lain.map((p, i) => (
              <span key={p}>
                {i > 0 && " · "}
                <Link href={keLain(p)}>{kecil(p)}</Link>
              </span>
            ))}
          </p>
          <p>
            <Link href="/">Kembali ke website</Link>
          </p>
        </>
      }
    >
      {pesan === "keluar-semua" && (
        <p role="status" className="masuk-pemberitahuan">
          Anda sudah keluar dari semua perangkat.
        </p>
      )}
      {dariAlumni && (
        <p role="note" className="masuk-pemberitahuan">
          Alumni: masuk dengan email terdaftar Anda.
        </p>
      )}
      {sedangMasukLain && (
        <p role="status" className="masuk-pemberitahuan">
          Anda sedang masuk sebagai {LABEL_PERAN_MASUK[sedangMasukLain].pendek}. Masuk di sini akan mengganti sesi tersebut.
        </p>
      )}
      {supabaseAktif ? (
        <FormMasuk peran={peran} lanjut={lanjut} />
      ) : (
        <p role="alert" className="masuk-pemberitahuan">
          Database belum disambungkan. Isi kunci Supabase di Vercel (lihat PANDUAN-CMS.md), lalu deploy ulang.
        </p>
      )}
    </HalamanMasuk>
  );
}
