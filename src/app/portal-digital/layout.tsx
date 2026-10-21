import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Portal Digital 22", template: "%s | Portal Digital 22" },
  description: "Pintu masuk layanan digital SMA Negeri 22 Bandung: guru dan tenaga kependidikan, siswa, dan orang tua.",
};

/** Kerangka dipasang per grup: (pintu) = kerangka situs publik; masuk/ = halaman masuk mandiri. */
export default function LayoutPortalDigital({ children }: { children: React.ReactNode }) {
  return children;
}
