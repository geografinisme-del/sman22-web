# Lembar banding tangkapan HP sebelum/sesudah (hasil audit-hp.mjs).
# Satu PNG per halaman: baris = mesin (Chromium, WebKit), kolom = 360/390/412 px × (sebelum | sesudah).
# Pakai: python scripts/uji-e2e/banding-hp.py <folder-sebelum> <folder-sesudah> <folder-keluar>
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sebelum, sesudah, keluar = sys.argv[1:4]
os.makedirs(keluar, exist_ok=True)
HALAMAN = ["beranda", "beranda-tur", "beranda-menu", "portal-digital", "portal-digital-masuk-gtk", "profil"]
PERANGKAT = ["360-galaxy", "390-iphone14", "412-pixel7"]
MESIN = ["chromium", "webkit"]
LEBAR = 220
try:
    huruf = ImageFont.truetype("arial.ttf", 15)
except OSError:
    huruf = ImageFont.load_default()


def muat(folder, awalan, mesin, perangkat, hal):
    p = os.path.join(folder, f"{awalan}-{mesin}-{perangkat}-{hal}.png")
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert("RGB")
    return im.resize((LEBAR, round(im.height * LEBAR / im.width)))


for hal in HALAMAN:
    sel = [[(muat(sebelum, "sebelum", m, d, hal), muat(sesudah, "sesudah", m, d, hal)) for d in PERANGKAT] for m in MESIN]
    tinggi = max((im.height for baris in sel for pas in baris for im in pas if im), default=0)
    if not tinggi:
        continue
    kol = len(PERANGKAT) * 2
    kanvas = Image.new("RGB", (kol * (LEBAR + 8) + 8, len(MESIN) * (tinggi + 34) + 8), "white")
    g = ImageDraw.Draw(kanvas)
    for r, m in enumerate(MESIN):
        y = 8 + r * (tinggi + 34)
        for c, d in enumerate(PERANGKAT):
            for k, label in enumerate(["sebelum", "sesudah"]):
                x = 8 + (c * 2 + k) * (LEBAR + 8)
                g.text((x, y), f"{m} {d.split('-')[0]}px · {label}", fill="#b00" if k == 0 else "#060", font=huruf)
                im = sel[r][c][k]
                if im:
                    kanvas.paste(im, (x, y + 22))
    kanvas.save(os.path.join(keluar, f"banding-{hal}.png"))
    print("tulis", f"banding-{hal}.png")
