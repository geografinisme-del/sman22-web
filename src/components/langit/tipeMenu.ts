import type { AksesCepat, GrupLangit, ItemKabar, KategoriKabar, Tautan } from "@/content/menu-langit";

/** Data navigasi yang disiapkan server (dataMenu.ts) untuk header, mega menu, menu HP, dan footer. */
export type DataMenu = {
  /** tujuan E-Learning dari CMS (atau halaman penjelasan bawaan) */
  eLearning: string;
  /** grup menu, sudah digabung isi CMS & URL E-Learning */
  grup: GrupLangit[];
  /** 3 kabar terbaru per kategori (mega menu Kabar & Agenda, menu HP) */
  kabar: Record<KategoriKabar, ItemKabar[]>;
  /** chip akses cepat panel desktop */
  chip: Tautan[];
  /** akses cepat per pengguna (menu HP) */
  akses: AksesCepat[];
  alamat: string;
  jamLayanan: string;
  /** hanya akun yang URL-nya diisi di CMS (Instagram, YouTube) */
  sosial: { nama: string; url: string }[];
};
