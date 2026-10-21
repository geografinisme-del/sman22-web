import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { NavAlumni } from "@/components/alumni/Nav";
import { FormSurveiAdmin } from "@/components/humas/Form";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";

export const metadata = { title: "Tracer study" };

export default async function Tracer({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "alumni.kelola");
  if (!kelola && !punya(akses, "alumni.lihat")) redirect("/admin?pesan=tanpa-akses");
  const { data } = await supabase.from("survei").select("id, judul, angkatan, mulai, selesai, terbit").eq("sasaran", "alumni").is("deleted_at", null).order("created_at", { ascending: false });
  return (
    <>
      <JudulHalaman judul="Tracer study" deskripsi="Kuesioner untuk alumni, bisa dibatasi per angkatan. Hasil hanya ditampilkan sebagai rekap; status kegiatan di profil alumni juga ikut diperbarui." />
      <NavAlumni kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <div className="space-y-3">
          {(data ?? []).length === 0 && <Kartu><p className="text-black/50">Belum ada tracer study.</p></Kartu>}
          {(data ?? []).map((s) => (
            <Kartu key={s.id}><Link href={`/admin/survei/${s.id}`} className="font-semibold hover:underline">{s.judul}</Link>
              <p className="text-sm text-black/60">{(s.angkatan as number[]).length ? `Angkatan ${(s.angkatan as number[]).join(", ")}` : "Semua angkatan"} · {s.mulai} – {s.selesai} · {s.terbit ? "terbit" : "draf"}</p></Kartu>))}
        </div>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 text-2xl">Tracer study baru</h2><FormSurveiAdmin hari={hariIniWIB()} tracer /></Kartu>}
      </div>
    </>
  );
}
