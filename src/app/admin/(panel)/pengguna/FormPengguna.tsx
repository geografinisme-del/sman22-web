"use client";

import Link from "next/link";
import { aturSandi, buatAkun, ubahPengguna } from "../../actions-pengguna";
import { Centang, FormAksi, Input, Pilihan, TombolSimpan, useErrorKolom } from "@/components/admin/form";

type Peran = { kode: string; nama: string; keterangan: string };
type Pegawai = { id: string; nama: string };

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
}: {
  peran: Peran[];
  pegawai: Pegawai[];
  pegawaiAwal?: Pegawai;
  adaKunci: boolean;
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
}: {
  data: { user_id: string; nama: string; aktif: boolean; peran: string[]; pegawai_id: string };
  peran: Peran[];
  pegawai: Pegawai[];
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
      </div>
      <Centang label="Akun aktif" nama="aktif" nilai={data.aktif} bantuan="Akun nonaktif tidak bisa mengakses data apa pun." />
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
