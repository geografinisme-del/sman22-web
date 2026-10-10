/** Akun portal siswa & orang tua memakai email buatan dari NISN (tidak pernah dikirimi email). */
export const DOMAIN_PORTAL = process.env.PORTAL_EMAIL_DOMAIN || "portal.sman22bdg.sch.id";

export const emailPortal = (nisn: string, jenis: "siswa" | "orang_tua") =>
  `${nisn}.${jenis === "siswa" ? "siswa" : "ortu"}@${DOMAIN_PORTAL}`;

/** Kata sandi awal yang mudah dibaca/diketik (tanpa huruf/angka yang mirip: 0/O, 1/l/I). */
export function sandiAcak(panjang = 10) {
  const huruf = "abcdefghjkmnpqrstuvwxyz";
  const angka = "23456789";
  const semua = huruf + angka;
  const acak = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const isi = [acak(huruf), acak(angka), ...Array.from({ length: panjang - 2 }, () => acak(semua))];
  for (let i = isi.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [isi[i], isi[j]] = [isi[j], isi[i]];
  }
  return isi.join("");
}
