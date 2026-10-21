import Link from "next/link";
import { Lencana, STATUS_KUMPUL, waktuWIB } from "@/lib/lms";
import { konteksPortal } from "../data";

export const metadata = { title: "Tugas & Kuis" };

type T = { id: string; judul: string; tenggat: string; nilai_maks: number; mapel: { nama: string } | null; tugas_kelas: { kelas_id: string }[] };
type K = { id: string; judul: string; mulai: string; selesai: string; durasi_menit: number; mapel: { nama: string } | null; kuis_kelas: { kelas_id: string }[] };

export default async function KelasPortal() {
  const { supabase, anak, ortu } = await konteksPortal();
  const [{ data: tugas }, { data: kuis }, { data: kumpul }, ...stat] = await Promise.all([
    supabase.from("tugas").select("id, judul, tenggat, nilai_maks, mapel(nama), tugas_kelas(kelas_id)").eq("terbit", true).is("deleted_at", null).order("tenggat"),
    supabase.from("kuis").select("id, judul, mulai, selesai, durasi_menit, mapel(nama), kuis_kelas(kelas_id)").eq("terbit", true).is("deleted_at", null).order("mulai"),
    supabase.from("pengumpulan_tugas").select("tugas_id, siswa_id, status, nilai, terlambat"),
    ...anak.map((a) => supabase.rpc("status_kuis", { p_siswa: a.id })),
  ]);
  const sekarang = new Date().getTime();

  return (
    <div className="space-y-10">
      {anak.filter((a) => a.kelas_id).map((a, idx) => {
        const st = new Map(((stat[idx]?.data ?? []) as { kuis_id: string; selesai_pada: string | null; skor: number | null }[]).map((s) => [s.kuis_id, s]));
        const tg = ((tugas ?? []) as unknown as T[]).filter((t) => t.tugas_kelas.some((k) => k.kelas_id === a.kelas_id));
        const kz = ((kuis ?? []) as unknown as K[]).filter((k) => k.kuis_kelas.some((x) => x.kelas_id === a.kelas_id));
        const k = (id: string) => (kumpul ?? []).find((x) => x.tugas_id === id && x.siswa_id === a.id);
        const aktif = tg.filter((t) => !k(t.id) || k(t.id)?.status === "dikembalikan");
        const lain = tg.filter((t) => !aktif.includes(t));
        return (
          <section key={a.id} className="space-y-6">
            <div>
              <h1 className="text-3xl">Tugas & kuis{ortu ? ` — ${a.nama}` : ""}</h1>
              <p className="text-sm text-[var(--muted)]">Kelas {a.kelas}</p>
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Perlu dikerjakan ({aktif.length})</h2>
              {aktif.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">Tidak ada tugas yang menunggu.</p> : (
                <ul className="space-y-2">
                  {aktif.map((t) => {
                    const lewat = Date.parse(t.tenggat) < sekarang;
                    return (
                      <li key={t.id}>
                        <Link href={`/portal/tugas/${t.id}`} className={`block rounded-2xl bg-white p-4 ring-1 hover:ring-muted ${lewat ? "ring-red-300" : "ring-black/5"}`}>
                          <span className="text-xs text-[var(--muted)]">{t.mapel?.nama}</span>
                          <span className="block font-semibold">{t.judul}</span>
                          <span className={`text-sm ${lewat ? "font-semibold text-blue-teks" : "text-[var(--muted)]"}`}>Tenggat {waktuWIB(t.tenggat)}{lewat && " — lewat"}</span>
                          {k(t.id)?.status === "dikembalikan" && <span className="ml-2"><Lencana s="dikembalikan" peta={STATUS_KUMPUL} /></span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Kuis</h2>
              {kz.length === 0 ? <p className="text-sm text-[var(--muted)]">Belum ada kuis.</p> : (
                <ul className="space-y-2">
                  {kz.map((q) => {
                    const s = st.get(q.id);
                    const status = s?.selesai_pada ? (s.skor != null ? `Skor ${Number(s.skor)}` : "Selesai") : Date.parse(q.mulai) > sekarang ? `Dibuka ${waktuWIB(q.mulai)}` : Date.parse(q.selesai) < sekarang ? "Ditutup" : s ? "Sedang dikerjakan" : "Sedang dibuka";
                    return (
                      <li key={q.id}>
                        <Link href={`/portal/kuis/${q.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:ring-muted">
                          <span className="flex-1"><span className="text-xs text-[var(--muted)]">{q.mapel?.nama}</span><span className="block font-semibold">{q.judul}</span></span>
                          <span className="text-sm font-semibold">{status}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {lain.length > 0 && (
              <div>
                <h2 className="mb-2 font-semibold">Sudah dikumpulkan</h2>
                <ul className="divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
                  {lain.map((t) => {
                    const x = k(t.id)!;
                    return (
                      <li key={t.id}>
                        <Link href={`/portal/tugas/${t.id}`} className="flex flex-wrap items-center gap-2 p-4 text-sm">
                          <span className="flex-1 font-medium">{t.judul}</span>
                          <Lencana s={x.status} peta={STATUS_KUMPUL} />
                          {x.nilai != null && <span className="font-semibold tabular-nums">{Number(x.nilai)}/{t.nilai_maks}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
