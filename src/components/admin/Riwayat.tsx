import { supabaseServer } from "@/lib/supabase/server";
import { Kartu } from "./ui";

const LABEL: Record<string, string> = {
  nama: "Nama", nisn: "NISN", nis: "NIS", jenis_kelamin: "Jenis kelamin", tempat_lahir: "Tempat lahir",
  tanggal_lahir: "Tanggal lahir", agama: "Agama", alamat: "Alamat", telepon: "Telepon", email: "Email",
  tahun_masuk: "Tahun masuk", status: "Status", keterangan_status: "Keterangan", nip: "NIP", nuptk: "NUPTK",
  jenis: "Jenis", jabatan: "Jabatan", deleted_at: "Diarsipkan",
};
const ABAIKAN = new Set(["updated_at", "created_at", "id", "user_id"]);

/** Riwayat perubahan satu data (dari audit log) — hanya untuk pengguna dengan izin audit.baca. */
export async function RiwayatPerubahan({ tabel, id }: { tabel: string; id: string }) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("audit_log")
    .select("id, waktu, aksi, user_id, data_lama, data_baru")
    .eq("tabel", tabel)
    .eq("record_id", id)
    .order("waktu", { ascending: false })
    .limit(20);
  const ids = [...new Set((data ?? []).map((d) => d.user_id).filter(Boolean))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama || o.email]));

  return (
    <Kartu>
      <h2 className="mb-4 text-2xl">Riwayat perubahan</h2>
      {!data?.length ? (
        <p className="text-sm text-black/50">Belum ada catatan.</p>
      ) : (
        <ol className="space-y-3 text-sm">
          {data.map((d) => {
            const lama = (d.data_lama ?? {}) as Record<string, unknown>;
            const baru = (d.data_baru ?? {}) as Record<string, unknown>;
            const berubah = d.aksi === "UPDATE" ? Object.keys(baru).filter((k) => !ABAIKAN.has(k) && JSON.stringify(lama[k]) !== JSON.stringify(baru[k])) : [];
            return (
              <li key={d.id} className="border-l-2 border-line pl-3">
                <p className="text-black/50">
                  {new Date(d.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })} ·{" "}
                  {nama.get(d.user_id) ?? "sistem"}
                </p>
                <p className="font-medium">
                  {d.aksi === "INSERT" ? "Data dibuat" : d.aksi === "DELETE" ? "Data dihapus" : berubah.length ? "Diubah:" : "Disimpan tanpa perubahan"}
                </p>
                {berubah.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-black/70">
                    {berubah.map((k) => (
                      <li key={k}>
                        {LABEL[k] ?? k}: <span className="text-black/40 line-through">{String(lama[k] ?? "—") || "—"}</span> →{" "}
                        {String(baru[k] ?? "—") || "—"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Kartu>
  );
}
