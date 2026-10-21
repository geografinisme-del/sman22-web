"use client";

import Link from "next/link";
import { aturSandi, buatAkun, tambahJabatan, ubahPengguna } from "../../actions-pengguna";
import { Centang, FormAksi, Input, Pilihan, TombolSimpan, useErrorKolom } from "@/components/admin/form";

type Peran = { kode: string; nama: string; keterangan: string };
type Pegawai = { id: string; nama: string };
type Jabatan = { kode: string; nama: string };

/** Jabatan = untuk tampilan & direktori GTK; hak akses tetap dari PERAN. */
function PilihJabatan({ jabatan, nilai }: { jabatan: Jabatan[]; nilai: string }) {
  return (
    <Pilihan
      label="Jabatan (tampilan & direktori, bukan hak akses)"
      nama="jabatan"
      nilai={nilai}
      opsi={[{ nilai: "", label: "— Belum diisi —" }, ...jabatan.map((j) => ({ nilai: j.kode, label: j.nama }))]}
    />
  );
}

/** Tambah jabatan baru ke daftar (mis. "Operator Dapodik"). */
export function FormTambahJabatan() {
  return (
    <FormAksi aksi={tambahJabatan} className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1">
        <Input label="Jabatan baru" nama="nama" wajib maks={60} placeholder="mis. Operator Dapodik" />
      </div>
      <TombolSimpan>Tambah jabatan</TombolSimpan>
    </FormAksi>
  );
}

function PilihPeran({ peran, terpilih }: { peran: Peran[]; terpilih: string[] }) {
  const error = useErrorKolom("peran");
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Peran</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {peran.map((p) => (
          <label key={p.kode} className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white p-3 has-[:checked]:border-muted has-[:checked]:bg-soft">
            <input type="checkbox" name="peran" value={p.kode} defaultChecked={terpilih.includes(p.kode)} className="mt-1 h-4 w-4" />
            <span>
              <span className="block text-sm font-semibold">{p.nama}</span>
              <span className="block text-xs text-black/50">{p.keterangan}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm text-blue-teks">{error}</p>}
    </fieldset>
  );
}

export function FormBuatAkun({
  peran,
  pegawai,
  pegawaiAwal,
  adaKunci,
  jabatan,
}: {
  peran: Peran[];
  pegawai: Pegawai[];
  pegawaiAwal?: Pegawai;
  adaKunci: boolean;
  jabatan: Jabatan[];
}) {
  return (
    <FormAksi aksi={buatAkun}>
      {!adaKunci && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Kunci rahasia Supabase belum dipasang di server, sehingga akun belum bisa dibuat langsung dari sini. Buat akunnya dulu di
          Supabase → Authentication → Users → Add user, lalu isi email yang sama di bawah untuk memberi peran.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Nama" nama="nama" nilai={pegawaiAwal?.nama} wajib />
        <Input label="Email" nama="email" tipe="email" wajib />
        {adaKunci && <Input label="Kata sandi awal" nama="password" tipe="text" wajib bantuan="Minimal 10 karakter, berisi huruf dan angka. Minta pemilik menggantinya." />}
        <Pilihan
          label="Tautkan ke data guru/pegawai"
          nama="pegawai_id"
          nilai={pegawaiAwal?.id ?? ""}
          opsi={[{ nilai: "", label: "— Tidak ditautkan —" }, ...pegawai.map((p) => ({ nilai: p.id, label: p.nama }))]}
        />
        <PilihJabatan jabatan={jabatan} nilai={pegawaiAwal ? "guru" : ""} />
      </div>
      <PilihPeran peran={peran} terpilih={pegawaiAwal ? ["guru"] : []} />
      <TombolSimpan>{adaKunci ? "Buat akun" : "Beri peran"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormUbahPengguna({
  data,
  peran,
  pegawai,
  jabatan,
}: {
  data: { user_id: string; nama: string; aktif: boolean; peran: string[]; pegawai_id: string; jabatan: string };
  peran: Peran[];
  pegawai: Pegawai[];
  jabatan: Jabatan[];
}) {
  return (
    <FormAksi aksi={ubahPengguna}>
      <input type="hidden" name="user_id" value={data.user_id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Nama" nama="nama" nilai={data.nama} wajib />
        <Pilihan
          label="Tautkan ke data guru/pegawai"
          nama="pegawai_id"
          nilai={data.pegawai_id}
          opsi={[{ nilai: "", label: "— Tidak ditautkan —" }, ...pegawai.map((p) => ({ nilai: p.id, label: p.nama }))]}
        />
        <PilihJabatan jabatan={jabatan} nilai={data.jabatan} />
      </div>
      <Centang label="Akun aktif" nama="aktif" nilai={data.aktif} bantuan="Akun nonaktif tidak bisa mengakses data apa pun." />
      {data.peran.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Akun ini belum punya peran (menunggu verifikasi) — saat masuk hanya melihat profilnya sendiri dan kontak operator. Setelah memastikan pemiliknya, pilih peran di bawah (minimal Pegawai umum).
        </p>
      )}
      <PilihPeran peran={peran} terpilih={data.peran} />
      <div className="flex items-center gap-3">
        <TombolSimpan>Simpan perubahan</TombolSimpan>
        <Link href="/admin/pengguna" className="text-sm text-black/60 hover:underline">
          Kembali
        </Link>
      </div>
    </FormAksi>
  );
}

export function FormSandi({ userId }: { userId: string }) {
  return (
    <FormAksi aksi={aturSandi} className="space-y-4">
      <input type="hidden" name="user_id" value={userId} />
      <Input label="Kata sandi baru" nama="password" tipe="text" wajib bantuan="Minimal 10 karakter, berisi huruf dan angka." />
      <TombolSimpan>Atur kata sandi</TombolSimpan>
    </FormAksi>
  );
}
