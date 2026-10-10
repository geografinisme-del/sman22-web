import { Papan } from "@/components/materi/Papan";
import { konteksPapan } from "./data";

export const metadata = { title: "Papan Tulis", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PapanKosong() {
  const { kelas } = await konteksPapan();
  return <Papan judul="Papan tulis" slide={[]} kelas={kelas} />;
}
