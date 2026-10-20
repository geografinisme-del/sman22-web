import type { Metadata } from "next";
import { KerangkaPublik } from "@/components/widget/KerangkaPublik";
import { getSitus } from "@/lib/data";
import "./portal-digital.css";

export const metadata: Metadata = {
  title: { default: "Portal Digital 22", template: "%s | Portal Digital 22" },
  description: "Pintu masuk layanan digital SMA Negeri 22 Bandung: guru, siswa, orang tua, ruang kerja manajemen, dan E-Library.",
};

/** Portal Digital 22 memakai kerangka publik yang sama (SiteHeader, menu layar penuh, SiteFooter). */
export default async function LayoutPortalDigital({ children }: { children: React.ReactNode }) {
  const { tampilan } = await getSitus();
  return (
    <KerangkaPublik konfig={tampilan}>
      <div className="pd">{children}</div>
    </KerangkaPublik>
  );
}
