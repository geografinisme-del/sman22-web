import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { NavAlumni } from "@/components/alumni/Nav";
import { setujuiAlumni, tolakAlumni } from "@/app/admin/actions-alumni";
import { wajibIzin } from "@/lib/admin/auth";
import { waktuWIB } from "@/lib/lms";

export const metadata = { title: "Verifikasi alumni" };
type R = { id: string; nama: string; tahun_lulus: number; nisn: string; tanggal_lahir: string | null; jurusan: string; kelas_terakhir: string; email: string; telepon: string; created_at: string; versi_privasi: string };
type C = { siswa_id: string; nama: string; nisn: string | null; tanggal_lahir: string | null; status: string; tingkat: string; profil_id: string | null; sudah_berakun: boolean };
const TINGKAT: Record<string, string> = { kuat: "Cocok kuat (NISN + tanggal lahir)", nisn: "NISN cocok, tanggal lahir berbeda", nama: "Hanya nama mirip" };

export default async function Verifikasi({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("alumni.kelola");
  const { data } = await supabase.from("pendaftaran_alumni").select("id, nama, tahun_lulus, nisn, tanggal_lahir, jurusan, kelas_terakhir, email, telepon, created_at, versi_privasi").eq("status", "menunggu").order("created_at");
  const list = (data ?? []) as R[];
  const cocok = await Promise.all(list.map((r) => supabase.rpc("cocok_pendaftaran_alumni", { p_id: r.id })));
  return (
    <>
      <JudulHalaman judul="Verifikasi pendaftaran alumni" deskripsi="Cocokkan dengan data lulusan. Setujui hanya bila identitas meyakinkan; bila ragu, hubungi pendaftar lewat kontaknya." />
      <NavAlumni kelola />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      {list.length === 0 && <Kartu><p className="text-black/50">Tidak ada pendaftaran yang menunggu.</p></Kartu>}
      <div className="space-y-4">{list.map((r, i) => {
        const c = (cocok[i].data ?? []) as C[];
        const kuat = c.find((x) => x.tingkat === "kuat" && !x.sudah_berakun);
        return (
          <Kartu key={r.id}>
            <div className="grid gap-4 lg:grid-cols-2">
              <dl className="grid grid-cols-[130px_1fr] gap-y-1 text-sm">
                <dt className="text-black/50">Nama</dt><dd className="font-semibold">{r.nama}</dd>
                <dt className="text-black/50">Tahun lulus</dt><dd>{r.tahun_lulus}{r.jurusan && ` · ${r.jurusan}`}{r.kelas_terakhir && ` · ${r.kelas_terakhir}`}</dd>
                <dt className="text-black/50">NISN</dt><dd>{r.nisn || "—"}</dd>
                <dt className="text-black/50">Tanggal lahir</dt><dd>{r.tanggal_lahir ?? "—"}</dd>
                <dt className="text-black/50">Kontak</dt><dd>{r.email}{r.telepon && ` · ${r.telepon}`}</dd>
                <dt className="text-black/50">Daftar</dt><dd>{waktuWIB(r.created_at)} · privasi v{r.versi_privasi}</dd>
              </dl>
              <form action={setujuiAlumni} className="space-y-2 text-sm">
                <input type="hidden" name="id" value={r.id} />
                <p className="font-semibold">Tautkan ke data lulusan</p>
                {c.length === 0 ? <p className="text-black/50">Tidak ditemukan di data induk (mis. lulusan sebelum sistem ini). Pastikan identitas lewat cara lain.</p> : c.map((x) => (
                  <label key={x.siswa_id} className={`flex items-start gap-2 rounded-lg p-2 ring-1 ${x.tingkat === "kuat" ? "bg-emerald-50 ring-emerald-200" : "ring-black/10"}`}>
                    <input type="radio" name="siswa_id" value={x.siswa_id} defaultChecked={x === kuat} disabled={x.sudah_berakun} className="mt-1" />
                    <span>{x.nama} · NISN {x.nisn ?? "—"} · lahir {x.tanggal_lahir ?? "—"} · status {x.status}<br /><span className="text-xs text-black/60">{TINGKAT[x.tingkat]}{x.sudah_berakun && " — sudah punya akun alumni"}</span></span>
                  </label>
                ))}
                <label className="flex items-center gap-2"><input type="radio" name="siswa_id" value="" defaultChecked={!kuat} /> Tanpa tautan data induk</label>
                <button className="rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white">Setujui & buat akun</button>
              </form>
            </div>
            <form action={tolakAlumni} className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3 text-sm">
              <input type="hidden" name="id" value={r.id} />
              <input name="catatan" maxLength={300} placeholder="Alasan (internal)" aria-label="Alasan penolakan" className="min-w-56 flex-1 rounded-xl border border-black/15 px-3 py-2" />
              <button className="rounded-full px-4 py-2 font-semibold text-blue-teks ring-1 ring-blue/30">Tolak</button>
            </form>
          </Kartu>
        );
      })}</div>
    </>
  );
}
