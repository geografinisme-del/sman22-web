"use client";

import { MediaSlot } from "@/components/MediaSlot";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { KartuBeranda } from "@/content/kartu-beranda";
import { phiKartu, sudutTerdekat, tampilKartu } from "@/lib/cincin";

/**
 * Kartu putar 3D beranda (CSS 3D + requestAnimationFrame, tanpa three.js).
 * - Tanpa JS, layar < 900px, atau prefers-reduced-motion: baris kartu geser biasa (scroll-snap).
 * - Desktop: cincin; putar otomatis 5°/detik; berhenti saat hover, saat hero tidak terlihat, dan 3 detik setelah
 *   interaksi. Seret 0.14°/px dengan inersia ×0.92/frame. Klik kartu samping = putar ke tengah; klik kartu tengah =
 *   buka tautan; seret > 6px bukan klik. Tombol ← → = tepat 1 kartu. Fokus keyboard memutar kartu ke tengah.
 * Geometri & tampilan per kartu dihitung di lib/cincin.ts (murni, diuji).
 */
const R = 760;
const PERSPEKTIF = 1100;
const KECEPATAN = 5; // derajat per detik
const JEDA_INTERAKSI = 3000;
const AMBANG_SERET = 6;

/** cubic-bezier(0.22, 1, 0.36, 1) — easing tunggal situs */
function ease(t: number) {
  const x1 = 0.22, y1 = 1, x2 = 0.36, y2 = 1;
  const bx = (u: number) => 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3;
  const by = (u: number) => 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3;
  let lo = 0, hi = 1, u = t;
  for (let i = 0; i < 18; i++) {
    u = (lo + hi) / 2;
    if (bx(u) < t) lo = u;
    else hi = u;
  }
  return by(u);
}

export function KartuPutar({ kartu }: { kartu: KartuBeranda[] }) {
  const wadah = useRef<HTMLDivElement>(null);
  const cincin = useRef<HTMLUListElement>(null);
  const [mode, setMode] = useState<"baris" | "cincin">("baris");
  const [depan, setDepan] = useState(0);
  const n = kartu.length;
  const step = 360 / Math.max(n, 1);

  // status mesin (tidak memicu render ulang)
  const s = useRef({ theta: 0, vel: 0, hover: false, terlihat: true, jedaSampai: 0, tekan: false, tarik: false, geser: 0, xAkhir: 0, anim: null as null | { dari: number; ke: number; mulai: number; dur: number } });
  const putarKe = useRef<(target: number) => void>(() => {});

  // pilih mode
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const atur = () => setMode(mq.matches && n > 2 ? "cincin" : "baris");
    atur();
    mq.addEventListener("change", atur);
    return () => mq.removeEventListener("change", atur);
  }, [n]);

  // mesin cincin
  useEffect(() => {
    if (mode !== "cincin") return;
    const w = wadah.current!;
    const ring = cincin.current!;
    const slot = [...ring.children] as HTMLElement[];
    const st = s.current;
    let raf = 0;
    let akhir = performance.now();
    let depanLama = -1;

    const render = () => {
      ring.style.transform = `translateZ(${R * 0.62}px) rotateY(${st.theta}deg)`;
      slot.forEach((el, i) => {
        const v = tampilKartu(i, st.theta, n, R);
        el.style.transform = v.transform;
        el.style.opacity = String(v.opacity);
        el.style.zIndex = String(v.z);
        el.style.pointerEvents = v.opacity < 0.05 ? "none" : "auto";
        el.toggleAttribute("data-depan", v.near > 0.5);
      });
      const d = (((Math.round(-st.theta / step) % n) + n) % n);
      if (d !== depanLama) {
        depanLama = d;
        setDepan(d);
      }
    };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - akhir) / 1000);
      akhir = t;
      if (st.anim) {
        const p = Math.min(1, (t - st.anim.mulai) / st.anim.dur);
        st.theta = st.anim.dari + (st.anim.ke - st.anim.dari) * ease(p);
        if (p >= 1) st.anim = null;
      } else if (!st.tarik && Math.abs(st.vel) > 0.01) {
        st.theta += st.vel;
        st.vel *= 0.92;
      } else if (!st.tarik && !st.hover && t > st.jedaSampai) {
        st.theta -= KECEPATAN * dt;
      }
      render();
      raf = st.terlihat && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    const jalan = () => {
      if (!raf && st.terlihat && !document.hidden) {
        akhir = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const jeda = () => (st.jedaSampai = performance.now() + JEDA_INTERAKSI);

    putarKe.current = (target: number) => {
      st.vel = 0;
      st.anim = { dari: st.theta, ke: target, mulai: performance.now(), dur: 650 };
      jeda();
      jalan();
    };

    // hentikan saat hero tidak terlihat / tab tersembunyi
    const hero = w.closest("[data-hero-langit]") ?? w;
    const io = new IntersectionObserver(([e]) => {
      st.terlihat = e.isIntersecting;
      jalan();
    });
    io.observe(hero);
    const vis = () => jalan();
    document.addEventListener("visibilitychange", vis);

    // hover
    const masuk = () => (st.hover = true);
    const keluar = () => {
      st.hover = false;
      jeda();
    };
    w.addEventListener("pointerenter", masuk);
    w.addEventListener("pointerleave", keluar);

    // seret (mouse & jari). Pointer baru "ditangkap" setelah bergeser > 6px, supaya klik biasa tetap
    // sampai ke tautan kartu (penangkapan pointer membelokkan event click ke panggung).
    const panggung = ring.parentElement!;
    const turun = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      // seleksi teks sisa klik sebelumnya bisa memicu seret bawaan peramban (dragstart → pointercancel)
      window.getSelection()?.removeAllRanges();
      st.tekan = true;
      st.tarik = false;
      st.geser = 0;
      st.xAkhir = e.clientX;
      jeda();
    };
    const gerak = (e: PointerEvent) => {
      if (!st.tekan) return;
      const dx = e.clientX - st.xAkhir;
      st.xAkhir = e.clientX;
      st.geser += Math.abs(dx);
      if (!st.tarik) {
        if (st.geser <= AMBANG_SERET) return;
        st.tarik = true;
        st.vel = 0;
        st.anim = null;
        panggung.setPointerCapture(e.pointerId);
      }
      st.theta += dx * 0.14;
      st.vel = dx * 0.14;
      jalan();
    };
    const naik = (e: PointerEvent) => {
      if (!st.tekan) return;
      st.tekan = false;
      st.tarik = false;
      if (panggung.hasPointerCapture(e.pointerId)) panggung.releasePointerCapture(e.pointerId);
      jeda();
    };
    const cegahSeretBawaan = (e: DragEvent) => e.preventDefault();
    panggung.addEventListener("dragstart", cegahSeretBawaan);
    panggung.addEventListener("pointerdown", turun);
    panggung.addEventListener("pointermove", gerak);
    panggung.addEventListener("pointerup", naik);
    panggung.addEventListener("pointercancel", naik);

    render();
    jalan();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      w.removeEventListener("pointerenter", masuk);
      w.removeEventListener("pointerleave", keluar);
      panggung.removeEventListener("dragstart", cegahSeretBawaan);
      panggung.removeEventListener("pointerdown", turun);
      panggung.removeEventListener("pointermove", gerak);
      panggung.removeEventListener("pointerup", naik);
      panggung.removeEventListener("pointercancel", naik);
      ring.style.transform = "";
      slot.forEach((el) => {
        el.style.transform = el.style.opacity = el.style.zIndex = el.style.pointerEvents = "";
        el.removeAttribute("data-depan");
      });
    };
  }, [mode, n, step]);

  const keKartu = (i: number) => putarKe.current(sudutTerdekat(s.current.theta, -i * step));
  const geserSatu = (arah: 1 | -1) => {
    const dasar = Math.round(s.current.anim ? s.current.anim.ke / step : s.current.theta / step) * step;
    putarKe.current(dasar - arah * step);
  };

  return (
    <div ref={wadah} className="lgt-cincin-wadah" data-mode={mode}>
      <div className="lgt-cincin-panggung" style={mode === "cincin" ? { perspective: `${PERSPEKTIF}px` } : undefined}>
        <ul ref={cincin} className="lgt-cincin" aria-label="Jelajahi sekolah">
          {kartu.map((k, i) => (
            <li key={k.id} className="lgt-cincin-slot">
              <a
                href={k.url}
                className="lgt-kartu"
                // hanya fokus keyboard (bukan klik/tekan mouse) yang memutar kartu ke tengah
                onFocus={(e) => mode === "cincin" && e.currentTarget.matches(":focus-visible") && keKartu(i)}
                onClick={(e) => {
                  if (mode !== "cincin") return;
                  // seret > 6px bukan klik; kartu samping diputar ke tengah dulu
                  if (s.current.geser > AMBANG_SERET || Math.abs(phiKartu(i, s.current.theta, n)) > step / 2) {
                    e.preventDefault();
                    if (s.current.geser <= AMBANG_SERET) keKartu(i);
                  }
                }}
                draggable={false}
              >
                <MediaSlot
                  src={k.foto || undefined}
                  alt=""
                  ratio="isi"
                  isPlaceholder={k.sementara}
                  sizes="(min-width: 900px) 360px, 260px"
                  priority={i < 2}
                  draggable={false}
                  className="lgt-kartu-foto"
                  kosong={<span className="lgt-kartu-22" aria-hidden>22</span>}
                />
                <span className="lgt-kartu-isi">
                  <span className="lgt-kartu-label">{k.label}</span>
                  <span className="lgt-kartu-judul">{k.judul}</span>
                  <span className="lgt-kartu-desk">{k.deskripsi}</span>
                  <span className="lgt-kartu-buka" aria-hidden>
                    Buka →
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      {mode === "cincin" && (
        <div className="lgt-cincin-kontrol">
          <button type="button" onClick={() => geserSatu(-1)} aria-label="Kartu sebelumnya">
            <ArrowLeft size={18} aria-hidden />
          </button>
          <span className="sr-only" aria-live="polite">
            Kartu {depan + 1} dari {n}: {kartu[depan]?.judul}
          </span>
          <button type="button" onClick={() => geserSatu(1)} aria-label="Kartu berikutnya">
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
