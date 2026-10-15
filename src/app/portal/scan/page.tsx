import { Scan } from "./Scan";

export const metadata = { title: "Kehadiran QR" };

export default async function HalamanScan({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-5 text-center font-serif text-3xl">Kehadiran di kelas</h1>
      {t ? <Scan token={t} /> : <p className="text-center text-[#5b6270]">Buka halaman ini dengan memindai QR dari guru menggunakan kamera HP.</p>}
    </div>
  );
}
