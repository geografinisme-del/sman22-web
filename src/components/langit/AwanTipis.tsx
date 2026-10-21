import "./awan-tipis.css";

/**
 * Awan tipis dekoratif (SVG inline, ±1 KB): 2–3 lapis awan putih lembut, opacity 0,45–0,75, blur 2–6px, melayang
 * horizontal sangat pelan (60–120 dtk per siklus, hanya transform). pointer-events none, aria-hidden, diam saat
 * prefers-reduced-motion. Dipakai menu HP dan halaman masuk portal. Gaya: awan-tipis.css.
 */
const BENTUK = "M0 120 C 60 60 140 60 190 95 C 230 40 330 40 370 95 C 420 55 520 60 560 110 C 620 70 720 80 760 120 Z";

export function AwanTipis({ lapis = 3, className = "" }: { lapis?: 2 | 3; className?: string }) {
  return (
    <div className={`lgt-awan-tipis ${className}`} aria-hidden>
      <svg className="lgt-at lgt-at-1" viewBox="0 0 760 140" preserveAspectRatio="none">
        <path d={BENTUK} />
      </svg>
      <svg className="lgt-at lgt-at-2" viewBox="0 0 760 140" preserveAspectRatio="none">
        <path d={BENTUK} />
      </svg>
      {lapis === 3 && (
        <svg className="lgt-at lgt-at-3" viewBox="0 0 760 140" preserveAspectRatio="none">
          <path d={BENTUK} />
        </svg>
      )}
    </div>
  );
}
