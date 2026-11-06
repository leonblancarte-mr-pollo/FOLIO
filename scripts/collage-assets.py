# -*- coding: utf-8 -*-
"""
Collages (2026-11-06): prepara los assets públicos de la función Collages.

1. Convierte los stickers fuente (PNG transparentes de ~1000 px) a WebP optimizado. Hay UNA CARPETA POR SET en
   assets-fuentes/stickers/<set>/ (botanico, psico, sello, tinta, poe, tarot, musica…): un set nuevo solo
   requiere crear su carpeta con los PNG y volver a correr el script (y darlo de alta en el catálogo y el SQL).
   Nunca se convierte nada dentro de una subcarpeta `revisar-marcas/` (marcas registradas) ni lo de EXCLUIR.
   Salida:
     public/collage/stickers/<id>.webp       (lado mayor 720 px, para el lienzo y la exportación 1080)
     public/collage/stickers/min/<id>.webp   (lado mayor 200 px, para la bandeja)
2. Genera el set propio de texturas (papel, cartón arrugado, kraft, cuaderno):
     public/collage/texturas/fondo-<id>.webp     (1080×1920, fondo del lienzo; en 1:1 se recorta al centro)
     public/collage/texturas/pieza-<id>.webp     (pieza suelta con orillas rasgadas y transparencia)
     public/collage/texturas/min/*.webp          (miniaturas de la bandeja)

Uso (desde la raíz del repo):  python scripts/collage-assets.py            (stickers de todos los sets + texturas)
                               python scripts/collage-assets.py stickers   (solo stickers, sin regenerar texturas)
                               python scripts/collage-assets.py carton     (solo esa textura)
Requiere Pillow con soporte WebP y numpy. Es determinista (semillas fijas): correrlo dos veces da los mismos archivos.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, "assets-fuentes", "stickers")
# Subcarpetas que jamás entran a la app (marcas registradas, en cualquier set).
CARPETAS_IGNORADAS = {"revisar-marcas"}
# Stickers excluidos por contenido (desnudos) aunque estén en la carpeta de su set. Si ya existían, se borran de public/.
EXCLUIR = {"tarot-la-estrella", "tarot-los-enamorados", "tarot-el-mundo"}
DEST = os.path.join(RAIZ, "public", "collage")


def asegurar(p):
    os.makedirs(p, exist_ok=True)
    return p


def ajustar(img, lado):
    w, h = img.size
    k = lado / max(w, h)
    if k >= 1:
        return img.copy()
    return img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)


def recortar_transparencia(img):
    bbox = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return img.crop(bbox) if bbox else img


# ---------------------------------------------------------------- stickers
def stickers():
    """Una carpeta por set: assets-fuentes/stickers/<set>/*.png → public/collage/stickers/<id>.webp (+ min/)."""
    if not os.path.isdir(FUENTE):
        print(f"[stickers] no existe {FUENTE}; se omite", file=sys.stderr)
        return
    d = asegurar(os.path.join(DEST, "stickers"))
    dmin = asegurar(os.path.join(d, "min"))
    por_set = {}
    for carpeta in sorted(os.listdir(FUENTE)):
        ruta = os.path.join(FUENTE, carpeta)
        if not os.path.isdir(ruta) or carpeta in CARPETAS_IGNORADAS:
            continue
        # Solo los PNG directos de la carpeta del set: las subcarpetas (p. ej. revisar-marcas/) no se recorren.
        for nombre in sorted(os.listdir(ruta)):
            sid, ext = os.path.splitext(nombre)
            if ext.lower() != ".png" or not os.path.isfile(os.path.join(ruta, nombre)):
                continue
            if sid in EXCLUIR:
                for viejo in (os.path.join(d, sid + ".webp"), os.path.join(dmin, sid + ".webp")):
                    if os.path.exists(viejo):
                        os.remove(viejo)
                continue
            img = recortar_transparencia(Image.open(os.path.join(ruta, nombre)).convert("RGBA"))
            ajustar(img, 720).save(os.path.join(d, sid + ".webp"), "WEBP", quality=82, method=6)
            ajustar(img, 200).save(os.path.join(dmin, sid + ".webp"), "WEBP", quality=78, method=6)
            por_set[carpeta] = por_set.get(carpeta, 0) + 1
    vacias = [c for c in sorted(os.listdir(FUENTE)) if os.path.isdir(os.path.join(FUENTE, c)) and c not in CARPETAS_IGNORADAS and c not in por_set]
    print(f"[stickers] {sum(por_set.values())} convertidos: " + ", ".join(f"{k} {v}" for k, v in por_set.items()))
    if vacias:
        print(f"[stickers] carpetas sin PNG (pendientes): {', '.join(vacias)}", file=sys.stderr)


# ---------------------------------------------------------------- ruido
def ruido_suave(h, w, escala, rng):
    """Ruido de valor suave: rejilla aleatoria reescalada con bicúbica."""
    gh, gw = max(2, h // escala + 2), max(2, w // escala + 2)
    g = (rng.random((gh, gw)) * 255).astype(np.uint8)
    im = Image.fromarray(g, "L").resize((w, h), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0


def fractal(h, w, rng, escalas=(256, 128, 64, 32, 16), pesos=(1, .6, .4, .25, .15)):
    acc = np.zeros((h, w), np.float32)
    for e, p in zip(escalas, pesos):
        acc += ruido_suave(h, w, e, rng) * p
    acc -= acc.min()
    return acc / max(acc.max(), 1e-6)


def sombreado(alt, fuerza):
    gy, gx = np.gradient(alt)
    luz = -(gx * 0.7 + gy * 0.7) * fuerza
    return luz


def colorear(base, variacion):
    """base: (r,g,b); variacion: matriz HxW en [-1,1] aprox."""
    arr = np.stack([np.full(variacion.shape, c, np.float32) for c in base], -1)
    arr += variacion[..., None] * 255
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def fibras(img, rng, n, color, largo=(6, 22), alfa=(18, 60), ancho=1):
    capa = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(capa)
    w, h = img.size
    for _ in range(n):
        x, y = rng.random() * w, rng.random() * h
        ang = rng.random() * np.pi
        l = largo[0] + rng.random() * (largo[1] - largo[0])
        dx, dy = np.cos(ang) * l, np.sin(ang) * l
        a = int(alfa[0] + rng.random() * (alfa[1] - alfa[0]))
        dr.line([(x, y), (x + dx, y + dy)], fill=color + (a,), width=ancho)
    return Image.alpha_composite(img.convert("RGBA"), capa).convert("RGB")


# ---------------------------------------------------------------- texturas
def tex_papel(h, w, rng):
    n = fractal(h, w, rng, escalas=(128, 32, 8, 3), pesos=(1, .5, .35, .3))
    img = colorear((246, 241, 231), (n - .5) * 0.06)
    return fibras(img, rng, int(w * h / 900), (170, 150, 120), largo=(4, 14), alfa=(10, 34))


def tex_carton(h, w, rng, pliegues=46):
    # Papel arrugado = superficie de facetas: suma de |distancia a una recta| de muchos pliegues al azar
    # (cada pliegue es una cresta o un valle recto). El sombreado de esas facetas da los quiebres nítidos.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    alt = np.zeros((h, w), np.float32)
    diag = float(np.hypot(w, h))
    for _ in range(pliegues):
        ang = rng.random() * np.pi
        nx, ny = np.cos(ang), np.sin(ang)
        c = (rng.random() - .5) * diag
        d = (xx - w / 2) * nx + (yy - h / 2) * ny - c
        fuerza = (0.25 + rng.random()) * (1 if rng.random() < .5 else -1)
        alt += np.minimum(np.abs(d), diag * 0.18) * fuerza / diag
    luz = sombreado(alt * 400, 1.0)
    luz = np.clip(luz / (np.abs(luz).std() * 3 + 1e-6), -1, 1)
    fino = fractal(h, w, rng, escalas=(16, 6, 2), pesos=(1, .6, .5)) - .5
    img = colorear((196, 160, 118), luz * 0.13 + fino * 0.07)
    return fibras(img, rng, int(w * h / 1400), (120, 90, 60), largo=(4, 12), alfa=(12, 40))


def tex_kraft(h, w, rng):
    n = fractal(h, w, rng, escalas=(200, 60, 12, 3), pesos=(1, .5, .4, .35))
    img = colorear((184, 139, 92), (n - .5) * 0.14)
    img = fibras(img, rng, int(w * h / 260), (95, 64, 35), largo=(5, 20), alfa=(20, 70))
    return fibras(img, rng, int(w * h / 700), (230, 200, 160), largo=(4, 12), alfa=(20, 55))


def tex_cuaderno(h, w, rng, renglon=64, margen=150):
    img = tex_papel(h, w, rng)
    img = Image.blend(img, Image.new("RGB", img.size, (252, 251, 246)), 0.55)
    dr = ImageDraw.Draw(img)
    for y in range(renglon * 3, h, renglon):
        dr.line([(0, y), (w, y)], fill=(160, 190, 222), width=2)
    dr.line([(margen, 0), (margen, h)], fill=(232, 140, 140), width=3)
    return img


TEXTURAS = {
    "papel": tex_papel,
    "carton": tex_carton,
    "kraft": tex_kraft,
    "cuaderno": tex_cuaderno,
}


def mascara_rasgada(w, h, rng, amp=14, paso=9, esquinas_redondas=False):
    """Polígono con las cuatro orillas irregulares (como papel arrancado a mano)."""
    pts = []
    def borde(x0, y0, x1, y1, normal):
        largo = max(abs(x1 - x0), abs(y1 - y0))
        k = max(2, int(largo / paso))
        acc = 0.0
        for i in range(k + 1):
            t = i / k
            acc = acc * 0.55 + (rng.random() - .5) * amp
            off = abs(acc) + rng.random() * amp * 0.35
            x = x0 + (x1 - x0) * t + normal[0] * off
            y = y0 + (y1 - y0) * t + normal[1] * off
            pts.append((x, y))
    m = amp * 1.6
    borde(m, m, w - m, m, (0, -1))
    borde(w - m, m, w - m, h - m, (1, 0))
    borde(w - m, h - m, m, h - m, (0, 1))
    borde(m, h - m, m, m, (-1, 0))
    mk = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mk).polygon(pts, fill=255)
    return mk


def pieza(textura, w, h, rng):
    cuerpo = textura.resize((w, h), Image.LANCZOS) if textura.size != (w, h) else textura
    mk = mascara_rasgada(w, h, rng)
    # Filo de fibra clara (el papel arrancado deja un canto blanco).
    filo = mk.filter(ImageFilter.MaxFilter(5))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(Image.new("RGBA", (w, h), (250, 247, 240, 255)), (0, 0), filo)
    cuerpo_rgba = cuerpo.convert("RGBA")
    cuerpo_rgba.putalpha(mk)
    return Image.alpha_composite(out, cuerpo_rgba)


def texturas(solo=None):
    d = asegurar(os.path.join(DEST, "texturas"))
    dmin = asegurar(os.path.join(d, "min"))
    medidas_pieza = {"papel": (720, 520), "carton": (680, 560), "kraft": (760, 300), "cuaderno": (600, 760)}
    for i, (tid, fn) in enumerate(TEXTURAS.items()):
        if solo and tid not in solo:
            continue
        rng = np.random.default_rng(1100 + i)
        fondo = fn(1920, 1080, rng)
        fondo.save(os.path.join(d, f"fondo-{tid}.webp"), "WEBP", quality=74, method=6)
        ajustar(fondo, 240).save(os.path.join(dmin, f"fondo-{tid}.webp"), "WEBP", quality=74, method=6)
        pw, ph = medidas_pieza[tid]
        rng2 = np.random.default_rng(2200 + i)
        tex = fn(ph, pw, rng2) if tid != "cuaderno" else tex_cuaderno(ph, pw, rng2, renglon=48, margen=90)
        pz = pieza(tex, pw, ph, rng2)
        pz.save(os.path.join(d, f"pieza-{tid}.webp"), "WEBP", quality=80, method=6)
        ajustar(pz, 200).save(os.path.join(dmin, f"pieza-{tid}.webp"), "WEBP", quality=78, method=6)
    print(f"[texturas] {len(TEXTURAS)} fondos y {len(TEXTURAS)} piezas")


if __name__ == "__main__":
    # Sin argumentos: todo. «stickers»: solo los stickers. Otros argumentos: solo esas texturas («carton»).
    solo = sys.argv[1:]
    if not solo or "stickers" in solo:
        stickers()
    if solo != ["stickers"]:
        texturas([x for x in solo if x != "stickers"])
