"use client";

import { MediaSlot } from "@/components/MediaSlot";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { KartuBeranda } from "@/content/kartu-beranda";
import { kartuDepan, phiKartu, sudutGeserSatu, sudutOtomatis, sudutOtomatisLangkah, sudutTerdekat, tampilKartu, tampilKartuHp } from "@/lib/cincin";

/**
 * Kartu putar 3D beranda (CSS 3D + requestAnimationFrame, tanpa three.js).
 * - Tanpa JS atau prefers-reduced-motion: baris kartu geser biasa (scroll-snap), tanpa putar otomatis.
 * - HP/tablet (< 900px): cincin ringan (mode "hp", lihat tampilKartuHp): kartu tengah ±78% lebar layar, tetangga
 *   mengintip kiri-kanan; maju otomatis satu kartu tiap 4 detik; usap dengan inersia lalu berhenti tepat di satu kartu;
 *   ketuk kartu samping → ke tengah, ketuk kartu tengah → buka. Hanya transform/opacity.
 * - Desktop: cincin TERUS berputar 5°/detik — hover tidak menghentikannya. Posisi dihitung dari waktu
 *   (theta = theta0 − kecepatan × waktu berjalan): saat hero di luar layar / tab tersembunyi frame tidak dirender,
 *   tetapi waktu tetap berjalan sehingga saat terlihat lagi posisinya sudah maju.
 * - Berhenti hanya saat: kartu diklik (diputar ke tengah lalu diam sebagai kartu terpilih), cincin diseret,
 *   atau kartu mendapat fokus keyboard. Lanjut saat: klik di luar cincin, Esc, 8 detik tanpa interaksi setelah
 *   memilih, atau fokus keluar dari cincin. Seret dilepas → inersia lalu putar otomatis.
 * - Klik kartu terpilih yang sudah di tengah = buka tautannya. Tombol ← → menggeser 1 kartu; otomatis lanjut 3 detik.
 * Geometri & sudut berbasis waktu dihitung di lib/cincin.ts (murni, diuji).
 */
const R = 760;
const PERSPEKTIF = 1100;
const KECEPATAN = 5; // derajat per detik
const DIAM_PILIH = 8000; // ms tanpa interaksi setelah kartu dipilih
const DIAM_TOMBOL = 3000; // ms setelah tombol ← →
const AMBANG_SERET = 6;
const HP_JEDA = 4000; // ms per langkah putar otomatis HP
const HP_DURASI = 700; // ms geseran satu kartu HP
const HP_GESER = 0.7; // jarak kartu tetangga = 0,7 × lebar kartu

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

type Keadaan = "otomatis" | "anim" | "diam" | "seret" | "inersia";
type Mesin = {
  keadaan: Keadaan;
  theta: number;
  /** jangkar putar otomatis: theta0 & waktu mulai (ms) */
  theta0: number;
  t0: number;
  vel: number;
  anim: null | { dari: number; ke: number; mulai: number; dur: number };
  /** batas waktu keadaan diam (Infinity = sampai fokus keyboard keluar dari cincin) */
  diamSampai: number;
  /** kartu terpilih (−1 = tidak ada) */
  pilih: number;
  terlihat: boolean;
  tekan: boolean;
  geser: number;
  xAkhir: number;
  /** sudut saat seret dimulai (HP: batas luncuran) */
  thetaSeret: number;
};
type Kendali = { putarKe: (target: number, opsi: { pilih: number; diam: number }) => void; lanjut: () => void };

export function KartuPutar({ kartu }: { kartu: KartuBeranda[] }) {
  const wadah = useRef<HTMLDivElement>(null);
  const cincin = useRef<HTMLUListElement>(null);
  const [mode, setMode] = useState<"baris" | "cincin" | "hp">("baris");
  // pengumuman pembaca layar hanya setelah tindakan pengguna (bukan setiap kartu lewat saat berputar otomatis)
  const [umumkan, setUmumkan] = useState("");
  const n = kartu.length;
  const step = 360 / Math.max(n, 1);

  const s = useRef<Mesin>({ keadaan: "otomatis", theta: 0, theta0: 0, t0: 0, vel: 0, anim: null, diamSampai: 0, pilih: -1, terlihat: true, tekan: false, geser: 0, xAkhir: 0, thetaSeret: 0 });
  const kendali = useRef<Kendali>({ putarKe: () => {}, lanjut: () => {} });

  // pilih mode
  useEffect(() => {
    // satu-satunya alasan tanpa animasi: prefers-reduced-motion (atau kartu terlalu sedikit untuk cincin)
    const gerak = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const lebar = window.matchMedia("(min-width: 900px)");
    const atur = () => setMode(!gerak.matches || n < 3 ? "baris" : lebar.matches ? "cincin" : "hp");
    // cincin baru dipasang setelah halaman selesai dimuat & peramban senggang: kerja JS/tata letak tidak bersaing
    // dengan muat awal (LCP). Sebelum itu kartu tampil sebagai baris berukuran sama (tanpa pergeseran tata letak).
    let idle = 0;
    let jeda = 0;
    const pasang = () => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(atur, { timeout: 1500 });
      else jeda = setTimeout(atur, 300) as unknown as number;
    };
    if (document.readyState === "complete") pasang();
    else window.addEventListener("load", pasang, { once: true });
    gerak.addEventListener("change", atur);
    lebar.addEventListener("change", atur);
    return () => {
      window.removeEventListener("load", pasang);
      if (idle) window.cancelIdleCallback(idle);
      clearTimeout(jeda);
      gerak.removeEventListener("change", atur);
      lebar.removeEventListener("change", atur);
    };
  }, [n]);

  // mesin cincin — useLayoutEffect: posisi kartu terpasang SEBELUM lukisan pertama mode baru (tanpa kedip tumpukan
  // kartu, dan gambar kartu tengah tidak pernah tampil lebih besar dari lukisan awal → tidak ada LCP kedua)
  useLayoutEffect(() => {
    if (mode === "baris") return;
    const hp = mode === "hp";
    const w = wadah.current!;
    const ring = cincin.current!;
    const slot = [...ring.children] as HTMLElement[];
    const st = s.current;
    let raf = 0;
    let akhir = performance.now();
    st.keadaan = "otomatis";
    st.pilih = -1;
    st.theta0 = st.theta;
    st.t0 = performance.now();
    if (hp) st.theta = st.theta0 = Math.round(st.theta / step) * step;

    // HP: jarak kartu tetangga mengikuti lebar kartu nyata (berubah saat layar diputar)
    let geserHp = 0;
    const ukur = () => {
      geserHp = (slot[0]?.offsetWidth ?? 300) * HP_GESER;
      digambar = NaN;
    };
    let digambar = NaN;
    const ro = hp ? new ResizeObserver(() => {
      ukur();
      jalan();
    }) : null;
    if (ro) {
      ro.observe(ring);
      ukur();
    }

    const render = () => {
      // HP: lewati frame bila tidak ada perubahan (jeda antarlangkah) — hemat baterai
      if (hp && st.theta === digambar && st.keadaan === w.dataset.keadaan) return;
      digambar = st.theta;
      if (!hp) ring.style.transform = `translateZ(${R * 0.62}px) rotateY(${st.theta}deg)`;
      slot.forEach((el, i) => {
        const v = hp ? tampilKartuHp(i, st.theta, n, geserHp) : tampilKartu(i, st.theta, n, R);
        el.style.transform = v.transform;
        el.style.opacity = String(v.opacity);
        el.style.zIndex = String(v.z);
        el.style.pointerEvents = v.opacity < 0.05 ? "none" : "auto";
        el.toggleAttribute("data-depan", v.near > 0.5);
        el.toggleAttribute("data-terpilih", st.pilih === i && (st.keadaan === "diam" || st.keadaan === "anim"));
      });
      w.dataset.keadaan = st.keadaan;
    };

    const mulaiOtomatis = (t: number) => {
      st.keadaan = "otomatis";
      st.pilih = -1;
      st.theta0 = st.theta;
      st.t0 = t;
    };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - akhir) / 1000);
      akhir = t;
      switch (st.keadaan) {
        case "otomatis":
          st.theta = hp ? sudutOtomatisLangkah(st.theta0, st.t0, t, step, HP_JEDA, HP_DURASI, ease) : sudutOtomatis(st.theta0, st.t0, t, KECEPATAN);
          break;
        case "anim": {
          const a = st.anim!;
          const p = Math.min(1, (t - a.mulai) / a.dur);
          st.theta = a.dari + (a.ke - a.dari) * ease(p);
          if (p >= 1) {
            st.anim = null;
            st.keadaan = "diam";
          }
          break;
        }
        case "inersia": {
          const k = dt * 60; // ×0.92 per frame pada 60 fps
          st.theta += st.vel * k;
          st.vel *= 0.92 ** k;
          if (Math.abs(st.vel) < 0.01) mulaiOtomatis(t);
          break;
        }
        case "diam":
          if (t > st.diamSampai) mulaiOtomatis(t);
          break;
        case "seret":
          break;
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

    kendali.current.putarKe = (target, { pilih, diam }) => {
      const t = performance.now();
      st.vel = 0;
      st.pilih = pilih;
      st.keadaan = "anim";
      st.anim = { dari: st.theta, ke: target, mulai: t, dur: 650 };
      st.diamSampai = t + 650 + diam;
      const d = kartuDepan(target, n);
      setUmumkan(`Kartu ${d + 1} dari ${n}: ${kartu[d]?.judul ?? ""}`);
      jalan();
    };
    kendali.current.lanjut = () => {
      if (st.keadaan !== "diam" && st.keadaan !== "anim") return;
      if (st.anim) st.theta = st.anim.ke;
      st.anim = null;
      mulaiOtomatis(performance.now());
      jalan();
    };

    // hero di luar layar / tab tersembunyi: frame tidak dirender, tetapi waktu putar otomatis tetap berjalan
    const hero = w.closest("[data-hero-langit]") ?? w;
    const io = new IntersectionObserver(([e]) => {
      st.terlihat = e.isIntersecting;
      jalan();
    });
    io.observe(hero);
    const vis = () => jalan();
    document.addEventListener("visibilitychange", vis);

    // klik di luar cincin (bukan kartu, bukan tombol ← →) atau Esc → lanjut berputar
    const klikLuar = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".lgt-cincin-slot, .lgt-cincin-kontrol")) return;
      kendali.current.lanjut();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") kendali.current.lanjut();
    };
    document.addEventListener("pointerdown", klikLuar);
    document.addEventListener("keydown", esc);
    // fokus keyboard keluar dari cincin → lanjut berputar
    const fokusKeluar = (e: FocusEvent) => {
      if (st.diamSampai === Infinity && !ring.contains(e.relatedTarget as Node | null)) kendali.current.lanjut();
    };
    ring.addEventListener("focusout", fokusKeluar);

    // seret (mouse & jari). Pointer baru "ditangkap" setelah bergeser > 6px, supaya klik biasa tetap
    // sampai ke tautan kartu (penangkapan pointer membelokkan event click ke panggung).
    const panggung = ring.parentElement!;
    const turun = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      // seleksi teks sisa klik sebelumnya bisa memicu seret bawaan peramban (dragstart → pointercancel)
      window.getSelection()?.removeAllRanges();
      st.tekan = true;
      st.geser = 0;
      st.xAkhir = e.clientX;
    };
    const gerak = (e: PointerEvent) => {
      if (!st.tekan) return;
      const dx = e.clientX - st.xAkhir;
      st.xAkhir = e.clientX;
      st.geser += Math.abs(dx);
      if (st.keadaan !== "seret") {
        if (st.geser <= AMBANG_SERET) return;
        st.keadaan = "seret";
        st.pilih = -1;
        st.vel = 0;
        st.anim = null;
        st.thetaSeret = st.theta;
        panggung.setPointerCapture(e.pointerId);
      }
      // HP: kartu mengikuti jari (geser satu lebar langkah = satu kartu)
      const d = hp ? (dx / Math.max(geserHp, 1)) * step : dx * 0.14;
      st.theta += d;
      st.vel = d;
      jalan();
    };
    const naik = (e: PointerEvent) => {
      if (!st.tekan) return;
      st.tekan = false;
      if (panggung.hasPointerCapture(e.pointerId)) panggung.releasePointerCapture(e.pointerId);
      if (st.keadaan === "seret" && hp) {
        // HP: luncuran berinersia (perlambatan easing) yang berhenti tepat di satu kartu. Tujuan = posisi + dorongan
        // kecepatan jari, dibatasi sejauh kartu yang benar-benar diseret (usap pendek = tepat satu kartu)
        const t = performance.now();
        const jauh = Math.max(1, Math.ceil(Math.abs(st.theta - st.thetaSeret) / step - 0.15));
        const dasar = Math.round(st.thetaSeret / step);
        const ke = Math.min(dasar + jauh, Math.max(dasar - jauh, Math.round((st.theta + st.vel * 6) / step))) * step;
        st.keadaan = "anim";
        st.anim = { dari: st.theta, ke, mulai: t, dur: 480 };
        st.diamSampai = t + 480 + 2500;
        const d = kartuDepan(ke, n);
        setUmumkan(`Kartu ${d + 1} dari ${n}: ${kartu[d]?.judul ?? ""}`);
        jalan();
      } else if (st.keadaan === "seret") {
        st.keadaan = "inersia";
        jalan();
      }
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
      ro?.disconnect();
      document.removeEventListener("visibilitychange", vis);
      document.removeEventListener("pointerdown", klikLuar);
      document.removeEventListener("keydown", esc);
      ring.removeEventListener("focusout", fokusKeluar);
      panggung.removeEventListener("dragstart", cegahSeretBawaan);
      panggung.removeEventListener("pointerdown", turun);
      panggung.removeEventListener("pointermove", gerak);
      panggung.removeEventListener("pointerup", naik);
      panggung.removeEventListener("pointercancel", naik);
      ring.style.transform = "";
      delete w.dataset.keadaan;
      slot.forEach((el) => {
        el.style.transform = el.style.opacity = el.style.zIndex = el.style.pointerEvents = "";
        el.removeAttribute("data-depan");
        el.removeAttribute("data-terpilih");
      });
    };
  }, [mode, n, step, kartu]);

  /** pilih kartu i: putar ke tengah lalu diam (klik: 8 detik; fokus keyboard: sampai fokus keluar) */
  const pilihKartu = (i: number, diam: number) => kendali.current.putarKe(sudutTerdekat(s.current.theta, -i * step), { pilih: i, diam });
  const geserSatu = (arah: 1 | -1) => {
    const st = s.current;
    kendali.current.putarKe(sudutGeserSatu(st.anim ? st.anim.ke : st.theta, n, arah), { pilih: -1, diam: DIAM_TOMBOL });
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
                // hanya fokus keyboard (bukan klik/tekan mouse) yang memutar kartu ke tengah & menghentikan putaran
                onFocus={(e) => mode !== "baris" && e.currentTarget.matches(":focus-visible") && pilihKartu(i, Infinity)}
                onClick={(e) => {
                  if (mode === "baris") return;
                  const st = s.current;
                  // seret > 6px bukan klik (hanya klik pointer; Enter dari keyboard memiliki detail 0)
                  if (e.detail !== 0 && st.geser > AMBANG_SERET) {
                    e.preventDefault();
                    return;
                  }
                  // kartu terpilih yang sudah di tengah → buka tautan; selain itu pilih dulu (putar ke tengah lalu diam)
                  // HP: kartu yang sedang di tengah langsung dibuka (tanpa harus dipilih dulu)
                  const diTengah =
                    mode === "hp"
                      ? st.keadaan !== "seret" && st.keadaan !== "inersia" && Math.abs(phiKartu(i, st.theta, n)) < step / 4
                      : st.keadaan === "diam" && st.pilih === i && Math.abs(phiKartu(i, st.theta, n)) < step / 2;
                  if (!diTengah) {
                    e.preventDefault();
                    pilihKartu(i, st.diamSampai === Infinity && st.pilih === i ? Infinity : DIAM_PILIH);
                  }
                }}
                draggable={false}
              >
                <MediaSlot
                  src={k.foto || undefined}
                  alt=""
                  ratio="isi"
                  isPlaceholder={k.sementara}
                  sizes="(min-width: 900px) 360px, min(78vw, 340px)"
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
            {umumkan}
          </span>
          <button type="button" onClick={() => geserSatu(1)} aria-label="Kartu berikutnya">
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
