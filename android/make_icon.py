# Draws the Opening Quest launcher icon at every Android density.
import sys
from PIL import Image, ImageDraw, ImageFont
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
grad = Image.new("RGBA", (S, S))
gd = ImageDraw.Draw(grad)
for y in range(S):
    t = y / S
    r = int(59 + (219 - 59) * t * 0.8); g = int(79 + (39 - 79) * t); b = int(216 + (119 - 216) * t)
    gd.line([(0, y), (S, y)], fill=(r, g, b, 255))
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=230, fill=255)
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)
font = ImageFont.truetype(r"C:\Windows\Fonts\seguisym.ttf", 640)
d.text((S / 2 + 8, S / 2 + 18), "\u265E", font=font, fill=(0, 0, 0, 70), anchor="mm")
d.text((S / 2, S / 2), "\u265E", font=font, fill=(255, 255, 255, 255), anchor="mm")
star = ImageFont.truetype(r"C:\Windows\Fonts\seguisym.ttf", 230)
d.text((800, 230), "\u2605", font=star, fill=(251, 191, 36, 255), anchor="mm")
out = sys.argv[1]
for name, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    img.resize((px, px), Image.LANCZOS).save(f"{out}/mipmap-{name}/ic_launcher.png")
img.resize((512, 512), Image.LANCZOS).save(f"{out}/../icon-512.png")
print("icons written")
