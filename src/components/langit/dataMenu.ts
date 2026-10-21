import "server-only";
import { tautanELearning } from "@/content/menu";
import { AKSES_CEPAT, CHIP_AKSES, GRUP_LANGIT, denganELearning, denganELearningTautan, gabungMenuCms } from "@/content/menu-langit";
import { sekolah } from "@/content/sekolah";
import { getProfil, getSitus } from "@/lib/data";
import { getKabarMenu, getMenuCms } from "@/lib/menu-data";
import type { DataMenu } from "./tipeMenu";

/**
 * Data navigasi "Langit cerah": struktur menu dari kode + teks/sorotan CMS (cache 5 menit), kabar terbaru
 * (cache 5 menit), E-Learning dari CMS, alamat & jam layanan dari profil, media sosial Instagram & YouTube (URL https).
 */
export async function dataMenu(): Promise<DataMenu> {
  const [situs, profil, cms, kabar] = await Promise.all([getSitus(), getProfil(), getMenuCms(), getKabarMenu()]);
  const eLearning = tautanELearning(situs.layanan);
  return {
    eLearning,
    grup: denganELearning(gabungMenuCms(GRUP_LANGIT, cms), eLearning),
    kabar,
    chip: denganELearningTautan(CHIP_AKSES, eLearning),
    akses: denganELearning(AKSES_CEPAT, eLearning),
    alamat: [profil.alamat, sekolah.kota].filter(Boolean).join(", "),
    jamLayanan: profil.jamLayanan,
    sosial: situs.sosialMedia.filter((x) => /^(instagram|youtube)$/i.test(x.nama.trim()) && /^https:\/\//.test(x.url)).map((x) => ({ nama: x.nama, url: x.url })),
  };
}
