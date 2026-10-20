import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, Lencana } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { FormKonfirmasi } from "./FormKonfirmasi";

export const metadata = { title: "SP & Panggilan Orang Tua" };

type D = { siswa_id: string; nama: string; kelas: string | null; jenis: "alpa" | "terlambat"; jumlah: number; ambang: number; label: string; urutan: number; dikonfirmasi: boolean; dikonfirmasi_pada: string | null; catatan: string | null };

export default async function Disiplin({ searchParams }: { searchParams: Promise<{ lihat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "disiplin.lihat") && !berperan(akses, "wali_kelas")) redirect("/admin?pesan=tanpa-akses");
  const bisaKonfirmasi = punya(akses, "disiplin.kelola");
  const { data: aturan } = await supabase.from("aturan_disiplin").select("jenis, ambang, label").order("jenis").order("ambang");
  const { data } = await supabase.rpc("status_disiplin");
  const semua = (data ?? []) as D[];
  const selesai = sp.lihat === "selesai";
  const list = semua.filter((d) => d.dikonfirmasi === selesai);

  return (
    <>
      <JudulHalaman
        judul="SP & Panggilan Orang Tua"
        deskripsi="Muncul otomatis dari absensi tahun ajaran aktif. Data ini rahasia: tidak pernah tampil di website."
      />
      <details className="mb-5 rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
        <summary className="cursor-pointer font-semibold">Aturan yang berlaku</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {aturan?.map((a) => (
            <li key={a.jenis + a.ambang}>{a.ambang}× {a.jenis === "alpa" ? "Alpa" : "Terlambat"} → <strong>{a.label}</strong></li>
          ))}
        </ul>
      </details>
      <nav className="mb-5 flex gap-2 text-sm">
        <a href="/admin/absensi/disiplin" className={`rounded-full px-4 py-2 ${!selesai ? "bg-ink text-white" : "ring-1 ring-black/10"}`}>
          Perlu tindakan ({semua.filter((d) => !d.dikonfirmasi).length})
        </a>
        <a href="/admin/absensi/disiplin?lihat=selesai" className={`rounded-full px-4 py-2 ${selesai ? "bg-ink text-white" : "ring-1 ring-black/10"}`}>
          Sudah ditindaklanjuti ({semua.filter((d) => d.dikonfirmasi).length})
        </a>
      </nav>
      {list.length === 0 ? (
        <KosongAdmin teks={selesai ? "Belum ada tindak lanjut yang dikonfirmasi." : "Tidak ada siswa yang perlu ditindaklanjuti."} />
      ) : (
        <ul className="space-y-3">
          {list.map((d) => (
            <li key={`${d.siswa_id}-${d.jenis}-${d.ambang}`} className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 lg:grid-cols-[1fr_380px]">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{d.nama}</span>
                  <span className="text-sm text-black/50">{d.kelas ?? "—"}</span>
                  <Lencana warna={d.label.startsWith("SP") ? "kuning" : "abu"}>{d.label}</Lencana>
                </p>
                <p className="mt-1 text-sm text-black/60">
                  {d.jumlah}× {d.jenis === "alpa" ? "alpa" : "terlambat"} tahun ajaran ini (ambang {d.ambang})
                </p>
                {d.dikonfirmasi && (
                  <p className="mt-2 text-sm">
                    <span className="text-black/50">
                      {d.dikonfirmasi_pada && new Date(d.dikonfirmasi_pada).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}:
                    </span>{" "}
                    {d.catatan}
                  </p>
                )}
              </div>
              {!d.dikonfirmasi && bisaKonfirmasi && <FormKonfirmasi siswaId={d.siswa_id} jenis={d.jenis} ambang={d.ambang} />}
              {!d.dikonfirmasi && !bisaKonfirmasi && <p className="text-sm text-black/50">Menunggu tindakan Kesiswaan/BK.</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
