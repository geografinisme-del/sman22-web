import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { E_LEARNING_BAWAAN, tautanELearning } from "@/content/menu";
import { getSitus } from "@/lib/data";

export const metadata: Metadata = {
  title: "E-Learning",
  description: "Kelas digital, materi, dan tugas daring SMA Negeri 22 Bandung — diakses lewat Portal Digital 22.",
};

/**
 * Halaman penjelasan E-Learning. Menu E-Learning menuju ke sini selama URL "E-Learning" di CMS
 * (Admin → Tampilan Website → Layanan) masih kosong. Isinya hanya fitur yang memang tersedia di portal.
 */
export default async function ELearning() {
  const url = tautanELearning((await getSitus()).layanan);
  const luar = url !== E_LEARNING_BAWAAN ? url : null;
  return (
    <>
      <PageHeader label="Pembelajaran" judul="E-Learning" deskripsi="Kelas digital, materi, dan tugas daring untuk siswa dan guru SMA Negeri 22 Bandung." />
      <section className="bagian">
        <div className="lp-wadah bacaan">
          <p className="text-[1.0625rem] leading-relaxed text-[#3b414b]">
            E-Learning sekolah berada di dalam Portal Digital 22 dan memakai akun yang sama dengan layanan sekolah lainnya.
          </p>
          <ul className="mt-6 space-y-3 text-[1.0625rem] leading-relaxed text-[#3b414b]">
            <li>
              <strong className="text-[#1f2328]">Siswa</strong> — masuk ke Portal Siswa untuk membuka kelas digital, materi pelajaran, tugas, dan kuis.
            </li>
            <li>
              <strong className="text-[#1f2328]">Guru</strong> — masuk ke Pojok Guru untuk mengelola kelas digital, materi, tugas, dan kuis.
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/portal-digital" className="bk-tombol">
              Masuk lewat Portal Digital 22
            </Link>
            {luar && (
              <a href={luar} className="tautan" target={luar.startsWith("https://") ? "_blank" : undefined} rel={luar.startsWith("https://") ? "noopener noreferrer" : undefined}>
                Buka E-Learning sekolah →
              </a>
            )}
          </div>
          <p className="mt-6 text-sm text-[#5b6270]">Belum punya akun atau lupa kata sandi? Hubungi wali kelas atau tata usaha sekolah.</p>
        </div>
      </section>
    </>
  );
}
