import { KerangkaPublik } from "@/components/widget/KerangkaPublik";
import { getSitus } from "@/lib/data";
import "./portal-digital.css";

/** "Pilih pintu Anda." & halaman keputusan akses memakai kerangka publik (SiteHeader, mega menu, SiteFooter). */
export default async function LayoutPintu({ children }: { children: React.ReactNode }) {
  const { tampilan } = await getSitus();
  return (
    <KerangkaPublik konfig={tampilan}>
      <div className="pd">{children}</div>
    </KerangkaPublik>
  );
}
