import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormDuta, FormTantangan, type DataTantangan } from "@/components/perpus/Literasi";
import { NavPerpus } from "@/components/perpus/Nav";
import { arsipTantangan, hapusDuta, moderasiUlasan, periksaJurnal } from "@/app/admin/actions-perpus";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Literasi" };
const TAB = [["jurnal", "Jurnal baca"], ["ulasan", "Ulasan buku"], ["tantangan", "Tantangan"], ["duta", "Duta literasi"]] as const;
type J = { id: string; siswa: string; kelas: string; judul: string; pengarang: string; tanggal: string; halaman: number; menit: number; ringkasan: string; status: string; catatan_pembina: string };
type U = { id: string; judul: string; penulis: string; kelas: string; rating: number; isi: string; status: string; dibuat: string; buku_id: string };
type P = { siswa_id: string; nama: string; kelas: string; buku: number; menit: number; tuntas: boolean };

export default async function Literasi({ searchParams }: { searchParams: Promise<{ tab?: string; pesan?: string; status?: string; t?: string; ubah?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const bina = punya(akses, "perpus.kelola") || punya(akses, "literasi.kelola");
  if (!bina && !punya(akses, "perpus.lihat")) redirect("/admin?pesan=tanpa-akses");
  const tab = TAB.some(([k]) => k === sp.tab) ? sp.tab! : "jurnal";
  const { data: tan } = await supabase.from("tantangan_literasi").select("id, judul, deskripsi, mulai, selesai, target_buku, target_menit").is("deleted_at", null).order("mulai", { ascending: false });
  const tantangan = (tan ?? []) as DataTantangan[];
  return (
    <>
      <JudulHalaman judul="Literasi" deskripsi="Periksa jurnal baca siswa, moderasi ulasan buku, kelola tantangan literasi dan duta literasi." />
      <NavPerpus kelola={punya(akses, "perpus.kelola")} />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {TAB.map(([k, l]) => <Link key={k} href={`?tab=${k}`} className={`rounded-full px-3 py-1.5 font-semibold ${tab === k ? "bg-brand-900 text-white" : "ring-1 ring-black/15"}`}>{l}</Link>)}
      </div>
      {tab === "jurnal" && <Jurnal status={sp.status === "semua" ? "semua" : "diajukan"} bina={bina} />}
      {tab === "ulasan" && <Ulasan bina={bina} />}
      {tab === "tantangan" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {tantangan.length === 0 && <Kartu><p className="text-black/50">Belum ada tantangan.</p></Kartu>}
            {tantangan.map((t) => <Tantangan key={t.id} t={t} buka={sp.t === t.id} bina={bina} />)}
          </div>
          {bina && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">{sp.ubah ? "Ubah tantangan" : "Tantangan baru"}</h2><FormTantangan key={sp.ubah ?? "baru"} d={tantangan.find((t) => t.id === sp.ubah)} /></Kartu>}
        </div>
      )}
      {tab === "duta" && <Duta bina={bina} />}
    </>
  );

  async function Jurnal({ status, bina }: { status: string; bina: boolean }) {
    const { data } = await supabase.rpc("daftar_jurnal", { p_status: status, p_batas: 200 });
    const list = (data ?? []) as J[];
    return (
      <div className="space-y-3">
        <p className="text-sm"><Link href="?tab=jurnal" className={status === "diajukan" ? "font-semibold" : "underline"}>Menunggu diperiksa</Link> · <Link href="?tab=jurnal&status=semua" className={status === "semua" ? "font-semibold" : "underline"}>Semua</Link></p>
        {list.length === 0 && <Kartu><p className="text-black/50">Tidak ada jurnal {status === "diajukan" ? "yang menunggu" : ""}.</p></Kartu>}
        {list.map((j) => (
          <Kartu key={j.id}>
            <p className="font-semibold">{j.judul} <span className="font-normal text-black/50">{j.pengarang && `· ${j.pengarang}`}</span></p>
            <p className="text-sm text-black/60">{j.siswa} · {j.kelas} · {tgl(j.tanggal)} · {[j.halaman ? `${j.halaman} hlm` : "", j.menit ? `${j.menit} menit` : ""].filter(Boolean).join(", ")} · <strong>{j.status}</strong></p>
            <p className="mt-2 whitespace-pre-line text-sm">{j.ringkasan}</p>
            {bina && (
              <form action={periksaJurnal} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={j.id} />
                <input name="catatan" defaultValue={j.catatan_pembina} maxLength={500} placeholder="Catatan untuk siswa (opsional)" aria-label="Catatan pembina" className="min-w-60 flex-1 rounded-xl border border-black/15 px-3 py-2 text-sm" />
                <button name="status" value="disetujui" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Setujui</button>
                <button name="status" value="revisi" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Minta perbaikan</button>
              </form>
            )}
          </Kartu>
        ))}
      </div>
    );
  }

  async function Ulasan({ bina }: { bina: boolean }) {
    const { data } = await supabase.rpc("daftar_ulasan", { p_status: "menunggu" });
    const list = (data ?? []) as U[];
    return (
      <div className="space-y-3">
        <p className="text-sm text-black/60">Ulasan yang disetujui tampil di katalog website <strong>tanpa nama</strong> (hanya “Siswa” / “Guru/Staf”). Tolak ulasan yang memuat identitas, ejekan, atau tidak relevan.</p>
        {list.length === 0 && <Kartu><p className="text-black/50">Tidak ada ulasan yang menunggu.</p></Kartu>}
        {list.map((u) => (
          <Kartu key={u.id}>
            <p className="font-semibold"><Link href={`/perpustakaan/${u.buku_id}`} target="_blank" className="hover:underline">{u.judul}</Link> <span className="text-amber-500">{"★".repeat(u.rating)}</span></p>
            <p className="text-sm text-black/50">{u.penulis} · {u.kelas}</p>
            <p className="mt-2 text-sm">{u.isi}</p>
            {bina && (
              <form action={moderasiUlasan} className="mt-3 flex gap-2"><input type="hidden" name="id" value={u.id} />
                <button name="status" value="tampil" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Tampilkan</button>
                <button name="status" value="ditolak" className="rounded-full px-4 py-2 text-sm font-semibold text-merah ring-1 ring-merah/30">Tolak</button>
              </form>
            )}
          </Kartu>
        ))}
      </div>
    );
  }

  async function Tantangan({ t, buka, bina }: { t: DataTantangan; buka: boolean; bina: boolean }) {
    const { data } = buka ? await supabase.rpc("progres_literasi", { p_tantangan: t.id }) : { data: null };
    const prog = (data ?? []) as P[];
    return (
      <Kartu>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold">{t.judul}</p>
            <p className="text-sm text-black/60">{tgl(t.mulai)} – {tgl(t.selesai)} · target {[t.target_buku ? `${t.target_buku} buku` : "", t.target_menit ? `${t.target_menit} menit` : ""].filter(Boolean).join(" & ")}</p>
            {t.deskripsi && <p className="mt-1 text-sm">{t.deskripsi}</p>}
          </div>
          <div className="flex gap-2 text-sm">
            <Link href={buka ? "?tab=tantangan" : `?tab=tantangan&t=${t.id}`} className="rounded-full px-3 py-1.5 font-semibold ring-1 ring-black/15">{buka ? "Tutup" : "Lihat progres"}</Link>
            {bina && <Link href={`?tab=tantangan&ubah=${t.id}`} className="rounded-full px-3 py-1.5 font-semibold ring-1 ring-black/15">Ubah</Link>}
            {bina && <form action={arsipTantangan}><input type="hidden" name="id" value={t.id} /><button className="rounded-full px-3 py-1.5 font-semibold text-merah ring-1 ring-merah/30">Arsipkan</button></form>}
          </div>
        </div>
        {buka && (
          <div className="mt-4 overflow-x-auto">
            <p className="mb-2 text-sm">{prog.filter((p) => p.tuntas).length} dari {prog.length} siswa peserta sudah tuntas.</p>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-1">Siswa</th><th>Kelas</th><th>Buku</th><th>Menit</th><th /></tr></thead>
              <tbody>{prog.map((p) => (
                <tr key={p.siswa_id} className="border-t border-black/5"><td className="py-1.5">{p.nama}</td><td>{p.kelas}</td><td className="tabular-nums">{p.buku}</td><td className="tabular-nums">{p.menit}</td><td>{p.tuntas && <span className="font-semibold text-emerald-700">tuntas</span>}</td></tr>
              ))}</tbody>
            </table>
            <p className="mt-2 text-xs text-black/50">Daftar ini internal (untuk apresiasi), tidak ditampilkan ke publik.</p>
          </div>
        )}
      </Kartu>
    );
  }

  async function Duta({ bina }: { bina: boolean }) {
    const { data } = await supabase.rpc("daftar_duta");
    const list = (data ?? []) as { id: string; nama: string; kelas: string; peran: string }[];
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Kartu>
          <h2 className="mb-3 font-serif text-2xl">Duta literasi tahun ini</h2>
          {list.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{list.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2"><span className="flex-1"><strong>{d.nama}</strong> · {d.kelas} · {d.peran}</span>
                {bina && <form action={hapusDuta}><input type="hidden" name="id" value={d.id} /><button className="text-xs font-semibold text-merah underline">Lepas</button></form>}</li>
            ))}</ul>
          )}
        </Kartu>
        {bina && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Tetapkan duta</h2><FormDuta /></Kartu>}
      </div>
    );
  }
}
