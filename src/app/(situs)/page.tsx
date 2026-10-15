import { SusunanBeranda } from "@/components/widget/SusunanBeranda";
import { getSitus } from "@/lib/data";

/** Beranda disusun dari widget sesuai konfigurasi tampilan terbit (Admin → Tema & Tampilan). */
export default async function Beranda() {
  const { tampilan } = await getSitus();
  return <SusunanBeranda konfig={tampilan} />;
}
