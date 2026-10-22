import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormAcaraAlumni, FormPeluang } from "@/components/alumni/Form";
import { NavAlumni } from "@/components/alumni/Nav";
import { moderasi } from "@/app/admin/actions-alumni";
import { wajibIzin } from "@/lib/admin/auth";
import { JENIS_KONTRIBUSI, JENIS_PELUANG, SASARAN_PELUANG, STATUS_MODERASI } from "@/lib/alumni";
import { Lencana, waktuWIB } from "@/lib/lms";
import { TabPills } from "@/components/admin/TabPills";

export const metadata = { title: "Layanan alumni" };
const TAB = [["peluang", "Peluang"], ["acara", "Acara"], ["mentor", "Mentor"], ["mentoring", "Permintaan mentoring"], ["cerita", "Cerita"], ["kontribusi", "Kontribusi"]] as const;

function Tombol({ tabel, id, tab, status, label, catatan, publik }: { tabel: string; id: string; tab: string; status: string[]; label: string[]; catatan?: boolean; publik?: boolean }) {
  return (
    <form action={moderasi} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="tabel" value={tabel} /><input type="hidden" name="id" value={id} /><input type="hidden" name="tab" value={tab} />
      {catatan && <input name="catatan" maxLength={300} placeholder="Catatan" aria-label="Catatan" className="min-w-48 flex-1 rounded-xl border border-black/15 px-3 py-1.5" />}
      {publik && <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="tampil_publik" /> tampil di website</label>}
      {status.map((s, i) => <button key={s} name="status" value={s} className={`rounded-full px-3 py-1.5 font-semibold ${i === 0 ? "bg-emerald-700 text-white" : "ring-1 ring-black/15"}`}>{label[i]}</button>)}
    </form>
  );
}

export default async function Layanan({ searchParams }: { searchParams: Promise<{ tab?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("alumni.kelola");
  const tab = TAB.some(([k]) => k === sp.tab) ? sp.tab! : "peluang";
  return (
    <>
      <JudulHalaman judul="Layanan & moderasi alumni" deskripsi="Semua kiriman alumni (peluang, cerita, tawaran mentor & kontribusi) tampil setelah ditinjau." />
      <NavAlumni kelola />
      <Notifikasi kode={sp.pesan} />
      <TabPills label="Jenis kiriman alumni" item={TAB.map(([k, l]) => ({ href: `?tab=${k}`, label: l }))} aktif={`?tab=${tab}`} />
      {tab === "peluang" && <Peluang />}
      {tab === "acara" && <Acara />}
      {tab === "mentor" && <Mentor />}
      {tab === "mentoring" && <Mentoring />}
      {tab === "cerita" && <Cerita />}
      {tab === "kontribusi" && <Kontribusi />}
    </>
  );

  async function Peluang() {
    const { data } = await supabase.from("peluang").select("id, judul, jenis, penyedia, sasaran, tenggat, status, tautan").order("created_at", { ascending: false }).limit(200);
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">{(data ?? []).map((x) => (
          <Kartu key={x.id}>
            <div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{x.judul}</p><Lencana s={x.status} peta={STATUS_MODERASI} /></div>
            <p className="text-sm text-black/60">{JENIS_PELUANG[x.jenis]} · {SASARAN_PELUANG[x.sasaran]}{x.penyedia && ` · ${x.penyedia}`}{x.tenggat && ` · tenggat ${x.tenggat}`}</p>
            {x.tautan && <a href={x.tautan} target="_blank" rel="noreferrer" className="text-sm text-blue-teks underline">tautan</a>}
            <Tombol tabel="peluang" id={x.id} tab="peluang" status={x.status === "tayang" ? ["arsip"] : ["tayang", "ditolak"]} label={x.status === "tayang" ? ["Arsipkan"] : ["Tayangkan", "Tolak"]} />
          </Kartu>))}</div>
        <Kartu className="self-start"><h2 className="mb-3 text-2xl">Peluang baru</h2><FormPeluang admin /></Kartu>
      </div>
    );
  }
  async function Acara() {
    const { data } = await supabase.from("acara_alumni").select("id, judul, mulai, tempat, kuota, publik, untuk_angkatan").is("deleted_at", null).order("mulai", { ascending: false });
    const { data: rs } = await supabase.from("rsvp_acara_alumni").select("acara_id, hadir");
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">{(data ?? []).map((a) => (
          <Kartu key={a.id}><p className="font-semibold">{a.judul}</p><p className="text-sm text-black/60">{waktuWIB(a.mulai, true)}{a.tempat && ` · ${a.tempat}`}{(a.untuk_angkatan as number[]).length > 0 && ` · angkatan ${(a.untuk_angkatan as number[]).join(", ")}`}{a.publik && " · di website"}</p>
            <p className="text-sm"><strong>{(rs ?? []).filter((r) => r.acara_id === a.id && r.hadir).length}</strong> akan hadir{a.kuota ? ` / kuota ${a.kuota}` : ""}</p></Kartu>))}</div>
        <Kartu className="self-start"><h2 className="mb-3 text-2xl">Acara baru</h2><FormAcaraAlumni /></Kartu>
      </div>
    );
  }
  async function Mentor() {
    const { data } = await supabase.from("mentor_alumni").select("id, bidang, deskripsi, kuota, status, aktif, profil_alumni(nama, tahun_lulus, institusi)").order("created_at", { ascending: false });
    type M = { id: string; bidang: string; deskripsi: string; kuota: number; status: string; profil_alumni: { nama: string; tahun_lulus: number; institusi: string } | null };
    return <div className="space-y-3">{((data ?? []) as unknown as M[]).map((m) => (
      <Kartu key={m.id}><div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{m.profil_alumni?.nama} <span className="font-normal text-black/50">· {m.profil_alumni?.tahun_lulus}{m.profil_alumni?.institusi && ` · ${m.profil_alumni.institusi}`}</span></p><Lencana s={m.status} peta={STATUS_MODERASI} /></div>
        <p className="text-sm"><strong>{m.bidang}</strong> · maks {m.kuota} siswa</p>{m.deskripsi && <p className="text-sm text-black/70">{m.deskripsi}</p>}
        {m.status === "menunggu" && <Tombol tabel="mentor_alumni" id={m.id} tab="mentor" status={["disetujui", "ditolak"]} label={["Setujui", "Tolak"]} />}</Kartu>))}
      {(data ?? []).length === 0 && <Kartu><p className="text-black/50">Belum ada tawaran mentor.</p></Kartu>}</div>;
  }
  async function Mentoring() {
    const { data } = await supabase.rpc("daftar_mentoring");
    type X = { id: string; mentor: string; bidang: string; siswa: string; kelas: string; topik: string; status: string; catatan_sekolah: string; dibuat: string };
    return <div className="space-y-3">
      <p className="text-sm text-black/60">Mentor hanya melihat nama & kelas siswa setelah disetujui. Atur pertemuan di sekolah dengan pendampingan BK/guru.</p>
      {((data ?? []) as X[]).map((x) => (
      <Kartu key={x.id}><div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{x.siswa} <span className="font-normal text-black/50">{x.kelas}</span> → {x.mentor} <span className="font-normal text-black/50">({x.bidang})</span></p><Lencana s={x.status} peta={STATUS_MODERASI} /></div>
        <p className="text-sm">“{x.topik}”</p>{x.catatan_sekolah && <p className="text-sm text-black/60">Catatan: {x.catatan_sekolah}</p>}
        {x.status === "diajukan" && <Tombol tabel="mentoring" id={x.id} tab="mentoring" status={["disetujui", "ditolak"]} label={["Setujui", "Tolak"]} catatan />}
        {x.status === "disetujui" && <Tombol tabel="mentoring" id={x.id} tab="mentoring" status={["selesai"]} label={["Tandai selesai"]} />}</Kartu>))}
      {(data ?? []).length === 0 && <Kartu><p className="text-black/50">Belum ada permintaan.</p></Kartu>}</div>;
  }
  async function Cerita() {
    const { data } = await supabase.from("cerita_alumni").select("id, judul, isi, status, foto_url, profil_alumni(nama, tahun_lulus)").order("created_at", { ascending: false });
    type C = { id: string; judul: string; isi: string; status: string; profil_alumni: { nama: string; tahun_lulus: number } | null };
    return <div className="space-y-3">{((data ?? []) as unknown as C[]).map((c) => (
      <Kartu key={c.id}><div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{c.judul} <span className="font-normal text-black/50">· {c.profil_alumni?.nama} ({c.profil_alumni?.tahun_lulus})</span></p><Lencana s={c.status} peta={STATUS_MODERASI} /></div>
        <p className="whitespace-pre-line text-sm text-black/70">{c.isi}</p>
        {c.status === "menunggu" && <Tombol tabel="cerita_alumni" id={c.id} tab="cerita" status={["tayang", "ditolak"]} label={["Tayangkan", "Tolak"]} catatan />}</Kartu>))}
      {(data ?? []).length === 0 && <Kartu><p className="text-black/50">Belum ada cerita.</p></Kartu>}</div>;
  }
  async function Kontribusi() {
    const { data } = await supabase.from("kontribusi_alumni").select("id, jenis, deskripsi, status, tampil_publik, nama_tampil, profil_alumni(nama, tahun_lulus)").order("created_at", { ascending: false });
    type K = { id: string; jenis: string; deskripsi: string; status: string; tampil_publik: boolean; nama_tampil: string; profil_alumni: { nama: string; tahun_lulus: number } | null };
    return <div className="space-y-3">{((data ?? []) as unknown as K[]).map((k) => (
      <Kartu key={k.id}><div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{JENIS_KONTRIBUSI[k.jenis]} · {k.profil_alumni?.nama ?? k.nama_tampil} <span className="font-normal text-black/50">{k.profil_alumni?.tahun_lulus}</span></p><Lencana s={k.status} peta={STATUS_MODERASI} /></div>
        <p className="text-sm">{k.deskripsi}</p>
        {k.status !== "selesai" && k.status !== "ditolak" && <Tombol tabel="kontribusi_alumni" id={k.id} tab="kontribusi" status={k.status === "diajukan" ? ["diterima", "ditolak"] : ["selesai"]} label={k.status === "diajukan" ? ["Terima", "Tolak"] : ["Selesai"]} publik />}</Kartu>))}
      {(data ?? []).length === 0 && <Kartu><p className="text-black/50">Belum ada kontribusi.</p></Kartu>}</div>;
  }
}
