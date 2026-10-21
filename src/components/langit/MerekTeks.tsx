/**
 * Teks merek header: "SMA NEGERI 22" (kapital) + "BANDUNG" yang rata kiri-kanan selebar nama sekolah.
 * Huruf BANDUNG dipisah per huruf hanya untuk tampilan (aria-hidden); pembaca layar membaca "Bandung" utuh.
 */
export function MerekTeks() {
  return (
    <span className="lgt-merek-teks">
      <strong>SMA Negeri 22</strong>
      <small>
        <span className="sr-only">Bandung</span>
        <span className="lgt-merek-kota" aria-hidden>
          {"BANDUNG".split("").map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </span>
      </small>
    </span>
  );
}
