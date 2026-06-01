from PIL import Image
import os

img = Image.open("avatars-grid.png").convert("RGB")
w, h = img.size
print(f"Image size: {w}x{h}")

cols, rows = 5, 2
cell_w = w // cols
cell_h = h // rows
print(f"Cell size: {cell_w}x{cell_h}")

square = cell_w  # square side = cell width
cy_offset = (cell_h - square) // 2  # vertical center offset within each cell
print(f"Square: {square}, cy_offset: {cy_offset}")

os.makedirs("public/avatars", exist_ok=True)

for row in range(rows):
    for col in range(cols):
        idx = row * cols + col + 1
        left = col * cell_w
        top = row * cell_h + cy_offset
        right = left + square
        bottom = top + square
        crop = img.crop((left, top, right, bottom))
        crop = crop.resize((200, 200), Image.LANCZOS)
        out_path = f"public/avatars/avatar-{idx}.png"
        crop.save(out_path, "PNG")
        print(f"Saved {out_path}")

print("Done!")
