#!/usr/bin/env bash
# Backup database Supabase (skema + data) ke folder backup/ (diabaikan git) memakai pg_dump 17 dari image Docker
# "postgres:17" yang sudah ada di komputer — tidak perlu memasang PostgreSQL.
#
# Pakai:  bash scripts/backup-produksi.sh
#   - Connection string dibaca dari .env.local:  SUPABASE_DB_URL="postgresql://postgres.<ref>:<sandi>@aws-0-<region>.pooler.supabase.com:5432/postgres"
#     (Supabase Dashboard → Connect → "Session pooler". Sambungan langsung db.<ref>.supabase.co memakai IPv6 dan
#      biasanya tidak bisa dari Docker Desktop Windows. Karakter khusus di kata sandi harus di-URL-encode, mis. @ → %40.)
#   - Kata sandi TIDAK pernah ditampilkan: tidak di-echo, tidak masuk argumen perintah (diteruskan lewat berkas env
#     sementara ber-izin 600 yang langsung dihapus).
# Hasil (backup/<waktu>/):
#   skema_public.sql      skema tabel/fungsi/policy RLS schema public
#   data.sql              data schema public + auth (akun) + storage (metadata berkas)
#   lengkap_public.dump   skema + data public format custom (untuk pg_restore)
set -euo pipefail
set +x

cd "$(dirname "$0")/.."
URL="${SUPABASE_DB_URL:-}"
if [ -z "$URL" ] && [ -f .env.local ]; then
  URL="$(grep -E '^SUPABASE_DB_URL=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\r')"
fi
if [ -z "$URL" ]; then
  echo "SUPABASE_DB_URL belum diisi di .env.local." >&2
  exit 1
fi

WAKTU="$(date +%Y%m%d-%H%M%S)"
KELUAR="backup/${WAKTU}"
mkdir -p "$KELUAR"
GAMBAR="${PG_DUMP_IMAGE:-postgres:17}"

# connection string → berkas env sementara (izin 600), dihapus saat skrip selesai
# berkas di folder backup/ (diabaikan git) agar terbaca Docker Desktop Windows; jalur Windows via cygpath bila ada
ENVTMP="backup/.env-sementara-$$"
trap 'rm -f "$ENVTMP"' EXIT
( umask 077; : > "$ENVTMP" )
printf 'PGURL=%s\n' "$URL" > "$ENVTMP"
unset URL

jalankan() {
  # $1 = berkas keluaran (di dalam container: /keluar/...), sisanya = argumen pg_dump
  local berkas="$1"; shift
  local envwin="$ENVTMP"
  command -v cygpath >/dev/null 2>&1 && envwin="$(cygpath -w "$(pwd)/$ENVTMP")"
  MSYS_NO_PATHCONV=1 docker run --rm --env-file "$envwin" -v "$(pwd -W 2>/dev/null || pwd)/${KELUAR}:/keluar" "$GAMBAR" \
    sh -c 'pg_dump "$PGURL" "$@" -f "/keluar/'"$berkas"'"' pg_dump "$@"
}

echo "Backup ke ${KELUAR}/ ..."
jalankan skema_public.sql --schema-only --schema=public --no-owner
jalankan data.sql --data-only --schema=public --schema=auth --schema=storage --no-owner
jalankan lengkap_public.dump --format=custom --schema=public --no-owner

echo "Selesai. Ukuran berkas:"
ls -l "$KELUAR" | awk 'NR>1 {printf "  %-22s %10s byte\n", $9, $5}'
echo "Pemeriksaan isi:"
echo "  tabel di skema_public.sql : $(grep -c '^CREATE TABLE' "$KELUAR/skema_public.sql")"
echo "  policy RLS                : $(grep -c '^CREATE POLICY' "$KELUAR/skema_public.sql")"
echo "  blok data (COPY) di data.sql: $(grep -c '^COPY ' "$KELUAR/data.sql")"
