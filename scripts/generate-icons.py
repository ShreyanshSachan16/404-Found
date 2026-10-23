import os
from PIL import Image, ImageDraw, ImageFont

def create_app_icon():
    assets_dir = os.path.join(os.path.dirname(__file__), '..', 'electron', 'assets')
    os.makedirs(assets_dir, exist_ok=True)

    size = (512, 512)
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background rounded rectangle
    margin = 24
    bg_box = [margin, margin, size[0] - margin, size[1] - margin]
    radius = 100

    # Outer dark glow / shadow
    draw.rounded_rectangle(bg_box, radius=radius, fill=(15, 17, 26, 255), outline=(134, 59, 255, 255), width=8)

    # 2. Concentric radar / scanner circles (Lost & Found beacon theme)
    center = (256, 220)
    for r, col, w in [
        (160, (134, 59, 255, 60), 3),
        (120, (71, 191, 255, 80), 3),
        (80, (134, 59, 255, 140), 4),
        (40, (245, 158, 11, 200), 5)
    ]:
        draw.ellipse([center[0]-r, center[1]-r, center[0]+r, center[1]+r], outline=col, width=w)

    # Crosshairs / compass needles
    draw.line([center[0]-170, center[1], center[0]+170, center[1]], fill=(134, 59, 255, 90), width=3)
    draw.line([center[0], center[1]-170, center[0], center[1]+170], fill=(134, 59, 255, 90), width=3)

    # Glowing beacon center point (Amber pulse)
    draw.ellipse([center[0]-14, center[1]-14, center[0]+14, center[1]+14], fill=(245, 158, 11, 255))
    draw.ellipse([center[0]-6, center[1]-6, center[0]+6, center[1]+6], fill=(255, 255, 255, 255))

    # Search beam / pin icon indicator
    draw.polygon([(256, 120), (280, 180), (256, 170), (232, 180)], fill=(71, 191, 255, 220))

    # 3. Text label "404 FOUND"
    try:
        # Try loading system font
        font_404 = ImageFont.truetype("arialbd.ttf", 68)
        font_sub = ImageFont.truetype("arialbd.ttf", 32)
    except Exception:
        font_404 = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text_404 = "404 FOUND"
    text_sub = "CAMPUS RECOVERY"

    bbox_404 = draw.textbbox((0, 0), text_404, font=font_404)
    w_404 = bbox_404[2] - bbox_404[0]
    draw.text(((512 - w_404) / 2, 380), text_404, fill=(240, 243, 255, 255), font=font_404)

    bbox_sub = draw.textbbox((0, 0), text_sub, font=font_sub)
    w_sub = bbox_sub[2] - bbox_sub[0]
    draw.text(((512 - w_sub) / 2, 445), text_sub, fill=(245, 158, 11, 240), font=font_sub)

    # Save 512x512 PNG
    png_path = os.path.join(assets_dir, 'icon.png')
    img.save(png_path, 'PNG')
    print(f"Generated PNG icon: {png_path}")

    # Generate multi-size Windows .ICO
    ico_path = os.path.join(assets_dir, 'icon.ico')
    img.save(
        ico_path,
        format='ICO',
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    )
    print(f"Generated Windows multi-size ICO: {ico_path}")

if __name__ == '__main__':
    create_app_icon()
