import "server-only";
import { tautanELearning } from "@/content/menu";
import { sekolah } from "@/content/sekolah";
import { getProfil, getSitus } from "@/lib/data";
import type { DataMenu } from "./FullMenu";

/**
 * Data menu & footer "Langit cerah": E-Learning dari CMS; alamat & jam layanan dari profil;
 * media sosial hanya Instagram & YouTube yang URL https-nya diisi di CMS.
 */
export async function dataMenu(): Promise<DataMenu> {
  const [situs, profil] = await Promise.all([getSitus(), getProfil()]);
  return {
    eLearning: tautanELearning(situs.layanan),
    alamat: [profil.alamat, sekolah.kota].filter(Boolean).join(", "),
    jamLayanan: profil.jamLayanan,
    sosial: situs.sosialMedia.filter((x) => /^(instagram|youtube)$/i.test(x.nama.trim()) && /^https:\/\//.test(x.url)).map((x) => ({ nama: x.nama, url: x.url })),
  };
}
