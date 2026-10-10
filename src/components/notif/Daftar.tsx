import type { SupabaseClient } from "@supabase/supabase-js";
import { tandaiSemuaDibaca } from "@/app/admin/actions-notif";
import { labelKategori } from "@/lib/notif/kategori";

type N = { id: number; kategori: string; judul: string; isi: string; prioritas: string; dibaca_pada: string | null; created_at: string };

const waktu = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (d < 1) return "baru saja";
  if (d < 60) return `${Math.floor(d)} menit lalu`;
  if (d < 1440) return `${Math.floor(d / 60)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
};

export async function DaftarNotifikasi({ supabase, kembali }: { supabase: SupabaseClient; kembali: string }) {
  const { data } = await supabase.from("notifikasi").select("id, kategori, judul, isi, prioritas, dibaca_pada, created_at").order("created_at", { ascending: false }).limit(60);
  const list = (data ?? []) as N[];
  const belum = list.filter((n) => !n.dibaca_pada).length;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-black/60">{belum ? `${belum} belum dibaca` : "Semua sudah dibaca"}</p>
        {belum > 0 && (
          <form action={tandaiSemuaDibaca}>
            <input type="hidden" name="kembali" value={kembali} />
            <button className="text-sm font-semibold text-brand-700 underline">Tandai semua dibaca</button>
          </form>
        )}
      </div>
      {!list.length ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-black/50 ring-1 ring-black/5">Belum ada notifikasi.</p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((n) => (
            <li key={n.id}>
              <a href={`/notif/${n.id}`} className={`flex gap-3 px-4 py-3 hover:bg-black/[0.03] ${n.dibaca_pada ? "" : "bg-brand-50/60"}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.dibaca_pada ? "bg-transparent" : n.prioritas === "penting" ? "bg-merah" : "bg-brand-700"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.dibaca_pada ? "" : "font-semibold"}`}>{n.judul}</span>
                  {n.isi && <span className="block text-sm text-black/60">{n.isi}</span>}
                  <span className="mt-0.5 block text-xs text-black/40">{labelKategori(n.kategori)} · {waktu(n.created_at)}</span>
                </span>
                {!n.dibaca_pada && <span className="sr-only">belum dibaca</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
