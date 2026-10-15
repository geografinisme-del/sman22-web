import { FormAjukanMentoring } from "@/components/alumni/Form";
import { JENIS_PELUANG, STATUS_MODERASI } from "@/lib/alumni";
import { Lencana } from "@/lib/lms";
import { konteksPortal } from "../data";

export const metadata = { title: "Alumni & peluang" };

export default async function AlumniPortal() {
  const { supabase, ortu } = await konteksPortal();
  const [{ data: pl }, { data: mt }, { data: mg }] = await Promise.all([
    supabase.from("peluang").select("id, judul, jenis, penyedia, deskripsi, tautan, tenggat").eq("status", "tayang").order("tenggat", { ascending: true, nullsFirst: false }).limit(60),
    ortu ? Promise.resolve({ data: [] }) : supabase.rpc("mentor_tersedia"),
    supabase.from("mentoring").select("id, topik, status, catatan_sekolah, mentor_alumni(bidang)").order("created_at", { ascending: false }),
  ]);
  const mentor = (mt ?? []) as { id: string; nama: string; tahun_lulus: number; bidang: string; deskripsi: string; sisa: number }[];
  const saya = (mg ?? []) as unknown as { id: string; topik: string; status: string; catatan_sekolah: string; mentor_alumni: { bidang: string } | null }[];
  return (
    <div className="space-y-8">
      <div><h1 className="font-serif text-3xl">Alumni & peluang</h1><p className="text-sm text-[#5b6270]">Info beasiswa, kuliah, dan lomba — serta kakak alumni yang siap berbagi pengalaman.</p></div>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Peluang</h2>
        {(pl ?? []).length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-[#5b6270] ring-1 ring-black/5">Belum ada info.</p> : (pl ?? []).map((x) => (
          <div key={x.id} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
            <p className="text-xs text-[#5b6270]">{JENIS_PELUANG[x.jenis]}</p><p className="font-semibold">{x.judul}</p>
            <p className="text-[#5b6270]">{x.penyedia}{x.tenggat && ` · tenggat ${new Date(x.tenggat + "T00:00:00Z").toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" })}`}</p>
            {x.deskripsi && <p className="mt-1">{x.deskripsi}</p>}
            {x.tautan && <a href={x.tautan} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-brand-700 underline">Info lengkap ↗</a>}
          </div>))}
      </section>
      {!ortu && (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Mentoring dengan alumni</h2>
          <p className="text-sm text-[#5b6270]">Pertemuan diatur sekolah dan didampingi guru BK. Kontak pribadi tidak dibagikan.</p>
          {saya.map((m) => <p key={m.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5">{m.mentor_alumni?.bidang}: “{m.topik}” <Lencana s={m.status} peta={STATUS_MODERASI} />{m.catatan_sekolah && <span className="block text-[#5b6270]">{m.catatan_sekolah}</span>}</p>)}
          {mentor.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-[#5b6270] ring-1 ring-black/5">Belum ada mentor.</p> : mentor.map((m) => (
            <details key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <summary className="cursor-pointer"><strong>{m.bidang}</strong> <span className="text-sm text-[#5b6270]">· Kak {m.nama} (alumni {m.tahun_lulus}){m.sisa <= 0 && " · penuh"}</span></summary>
              {m.deskripsi && <p className="mt-2 text-sm">{m.deskripsi}</p>}
              {m.sisa > 0 && <div className="mt-3"><FormAjukanMentoring mentor={m.id} /></div>}
            </details>))}
        </section>
      )}
    </div>
  );
}
