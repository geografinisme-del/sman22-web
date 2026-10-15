import { KerangkaPublik } from "@/components/widget/KerangkaPublik";
import { getSitus } from "@/lib/data";

export default async function SitusLayout({ children }: { children: React.ReactNode }) {
  // hanya konfigurasi tampilan yang sudah terbit (draf tidak pernah dibaca di sini)
  const { tampilan } = await getSitus();
  return <KerangkaPublik konfig={tampilan}>{children}</KerangkaPublik>;
}
