import Link from "next/link";
import { DIMENSI, type Dimensi } from "@/lib/kurikulum";
import { rentangTanggal } from "@/lib/kalender";
import { konteksPortal } from "../data";

export const metadata = { title: "Materi & Projek" };

type M = { id: string; judul: string; ringkasan: string; terbit_pada: string; mapel: { nama: string } | null; materi_kelas_target: { kelas_id: string }[] };
type P = { id: string; judul: string; tema: string; dimensi: string[]; deskripsi: string; mulai: string; selesai: string; status: string; projek_kelas: { kelas_id: string }[] };

export default async function MateriPortal() {
  const { supabase, anak } = await konteksPortal();
  const kelasIds = [...new Set(anak.map((a) => a.kelas_id).filter(Boolean))] as string[];
  const [{ data: m }, { data: p }] = await Promise.all([
    supabase.from("materi_kelas").select("id, judul, ringkasan, terbit_pada, mapel(nama), materi_kelas_target(kelas_id)").eq("terbit", true).is("deleted_at", null).order("terbit_pada", { ascending: false }).limit(60),
    kelasIds.length ? supabase.from("projek_kokurikuler").select("id, judul, tema, dimensi, deskripsi, mulai, selesai, status, projek_kelas!inner(kelas_id)").in("projek_kelas.kelas_id", kelasIds).is("deleted_at", null).order("mulai") : Promise.resolve({ data: [] }),
  ]);
  const materi = (m ?? []) as unknown as M[];
  const projek = (p ?? []) as unknown as P[];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-serif text-3xl">Materi pelajaran</h1>
        <p className="text-sm text-[#5b6270]">Materi yang dibagikan guru untuk kelas {anak.map((a) => a.kelas).filter(Boolean).join(", ")}.</p>
        {materi.length === 0 ? <p className="mt-4 rounded-2xl bg-white p-5 text-[#5b6270] ring-1 ring-black/5">Belum ada materi.</p> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {materi.map((x) => (
              <li key={x.id}>
                <Link href={`/portal/materi/${x.id}`} className="block rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:ring-brand-600">
                  <span className="text-xs text-[#5b6270]">{x.mapel?.nama}</span>
                  <span className="block font-semibold">{x.judul}</span>
                  {x.ringkasan && <span className="block text-sm text-[#5b6270]">{x.ringkasan}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-serif text-2xl">Projek kokurikuler</h2>
        {projek.length === 0 ? <p className="mt-2 text-sm text-[#5b6270]">Belum ada projek.</p> : (
          <ul className="mt-3 space-y-3">
            {projek.map((x) => (
              <li key={x.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="text-xs text-[#5b6270]">{x.tema} · {rentangTanggal(x.mulai, x.selesai)}</p>
                <p className="font-semibold">{x.judul}</p>
                <p className="mt-1 text-sm text-[#5b6270]">{x.dimensi.map((d) => DIMENSI[d as Dimensi] ?? d).join(" · ")}</p>
                {x.deskripsi && <p className="mt-2 whitespace-pre-line text-sm text-[#3b414b]">{x.deskripsi}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
