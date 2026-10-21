/**
 * Geometri kartu putar 3D beranda (modul murni, diuji dengan node --test).
 * step = 360/N; ring: translateZ(R*0.62) rotateY(theta);
 * kartu i: rotateY(i*step) translateZ(-R + near*120px) scale(1 + 0.38*s)
 * near = max(0, 1 - |phi|/step), s = smoothstep(near), phi = sudut kartu terhadap depan (-180..180).
 * Opacity memudar untuk |phi| 58°–80°, tersembunyi di belakang; z-index mengikuti |phi|.
 */

/** sudut ke rentang -180..180 */
export function normalSudut(a: number) {
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

export function phiKartu(i: number, theta: number, n: number) {
  return normalSudut(i * (360 / n) + theta);
}

export const smoothstep = (x: number) => x * x * (3 - 2 * x);

export function tampilKartu(i: number, theta: number, n: number, R: number) {
  const step = 360 / n;
  const phi = phiKartu(i, theta, n);
  const a = Math.abs(phi);
  const near = Math.max(0, 1 - a / step);
  const s = smoothstep(near);
  const opacity = a <= 58 ? 1 : a >= 80 ? 0 : 1 - (a - 58) / 22;
  return {
    phi,
    near,
    opacity,
    z: 1000 - Math.round(a * 5),
    transform: `rotateY(${i * step}deg) translateZ(${-R + near * 120}px) scale(${1 + 0.38 * s})`,
  };
}

/** sudut setara `target` (± kelipatan 360) yang paling dekat ke `dari` — putaran terpendek */
export function sudutTerdekat(dari: number, target: number) {
  return dari + normalSudut(target - dari);
}

/**
 * Sudut putaran otomatis berbasis waktu: theta = theta0 − kecepatan × waktu berjalan.
 * Dipakai agar saat hero di luar layar (frame tidak dirender) posisi tetap maju seolah tidak pernah berhenti.
 */
export function sudutOtomatis(theta0: number, t0: number, t: number, kecepatanDerajatPerDetik: number) {
  return theta0 - (kecepatanDerajatPerDetik * Math.max(0, t - t0)) / 1000;
}

/** Indeks kartu yang berada di depan untuk sudut theta. */
export function kartuDepan(theta: number, n: number) {
  const step = 360 / n;
  return ((Math.round(-theta / step) % n) + n) % n;
}

/** Sudut target untuk menggeser tepat satu kartu (arah 1 = berikutnya) dari kartu yang sedang/akan di depan. */
export function sudutGeserSatu(thetaAcuan: number, n: number, arah: 1 | -1) {
  const step = 360 / n;
  return Math.round(thetaAcuan / step) * step - arah * step;
}
