/** Properti untuk bagian beranda: latar dipakai langsung (tanpa JS) sekaligus ditandai untuk WarnaLatar. */
export const latar = (warna: string) => ({ "data-latar": warna, style: { backgroundColor: warna } });
