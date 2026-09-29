"""從影片抽指定格，拼成一張總覽圖（肉眼驗收用；轉場請抽交疊區中間的格）。
用法：python contact_sheet.py <影片.mp4> <格號...> [--cols 3] [--out sheet.jpg]
"""
import argparse, subprocess, sys
from pathlib import Path
from PIL import Image
sys.stdout.reconfigure(encoding='utf-8')

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('frames', nargs='+', type=int)
ap.add_argument('--cols', type=int, default=3); ap.add_argument('--out', default=None)
a = ap.parse_args()
video = Path(a.video)
out = Path(a.out) if a.out else video.with_name(video.stem + '_sheet.jpg')

tiles = []
for fr in a.frames:
    png = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(video), '-vf', f'select=eq(n\\,{fr}),scale=640:-1',
                          '-vframes', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    from io import BytesIO
    tiles.append(Image.open(BytesIO(png)).convert('RGB'))
w, h = tiles[0].size
cols = min(a.cols, len(tiles)); rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols + 1) * 10, rows * h + (rows + 1) * 10), '#555')
for i, t in enumerate(tiles):
    sheet.paste(t, (10 + (i % cols) * (w + 10), 10 + (i // cols) * (h + 10)))
sheet.save(out, quality=88)
print(f'✓ {out}（{len(tiles)} 格）')
