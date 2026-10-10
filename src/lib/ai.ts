import "server-only";

/**
 * Asisten AI untuk guru (Claude API, Anthropic). Hanya dipakai di server.
 * - Kunci: ANTHROPIC_API_KEY (rahasia, di Vercel). Model: AI_MODEL (opsional).
 * - TIDAK PERNAH mengirim data siswa: yang dikirim hanya mapel, fase, CP/TP, topik yang diketik guru.
 * - Hasil selalu berupa DRAF yang diperiksa & diedit guru sebelum dipakai.
 */
const URL_AI = (process.env.AI_URL || "https://api.anthropic.com").replace(/\/$/, "") + "/v1/messages";
export const MODEL_AI = process.env.AI_MODEL || "claude-sonnet-4-5";
export const aiAktif = () => Boolean(process.env.ANTHROPIC_API_KEY);

const SISTEM =
  "Anda asisten kurikulum untuk guru SMA Negeri di Indonesia yang memakai Kurikulum Merdeka (fase E untuk kelas X, fase F untuk kelas XI–XII). " +
  "Tulis dalam bahasa Indonesia baku yang ringkas dan operasional. Sesuaikan dengan konteks peserta didik SMA dan sekolah di Indonesia. " +
  "Jangan mengarang data pribadi siapa pun. Jawab HANYA dengan JSON valid sesuai format yang diminta, tanpa teks lain.";

export class GalatAI extends Error {}

export async function tanyaAI<T>(perintah: string, maksToken = 2500): Promise<T> {
  if (!aiAktif()) throw new GalatAI("Asisten AI belum diaktifkan sekolah (ANTHROPIC_API_KEY belum diisi).");
  let r: Response;
  try {
    r = await fetch(URL_AI, {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL_AI, max_tokens: maksToken, system: SISTEM, messages: [{ role: "user", content: perintah }] }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new GalatAI("Asisten AI tidak merespons. Coba lagi sebentar lagi.");
  }
  if (!r.ok) {
    console.error("[ai]", r.status, (await r.text().catch(() => "")).slice(0, 300));
    throw new GalatAI(r.status === 429 || r.status === 529 ? "Asisten AI sedang sibuk. Coba lagi beberapa menit lagi." : "Asisten AI gagal menjawab.");
  }
  const j = (await r.json()) as { content?: { type: string; text?: string }[] };
  const teks = (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const awal = teks.search(/[[{]/);
  const akhir = Math.max(teks.lastIndexOf("}"), teks.lastIndexOf("]"));
  if (awal < 0 || akhir < awal) throw new GalatAI("Jawaban AI tidak terbaca. Coba lagi.");
  try {
    return JSON.parse(teks.slice(awal, akhir + 1)) as T;
  } catch {
    throw new GalatAI("Jawaban AI tidak terbaca. Coba lagi.");
  }
}
