"""把 product-film 樣板複製到目標資料夾（不覆蓋既有檔案）。
用法：python new_film.py <目標資料夾>
之後：cd <目標> && npm install && python score.py && npm run render && python verify.py
"""
import shutil, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

if len(sys.argv) != 2:
    sys.exit('用法：python new_film.py <目標資料夾>')
src = Path(__file__).resolve().parent.parent / 'template'
dst = Path(sys.argv[1]).resolve()
if dst.exists() and any(dst.iterdir()):
    sys.exit(f'✗ {dst} 已存在且非空，為避免覆蓋請換一個資料夾')
shutil.copytree(src, dst, ignore=shutil.ignore_patterns('node_modules', 'out', 'score.wav'), dirs_exist_ok=True)
files = sorted(p.relative_to(dst).as_posix() for p in dst.rglob('*') if p.is_file())
print(f'✓ 樣板已複製到 {dst}（{len(files)} 個檔）')
for f in files: print('   ', f)
print('\n下一步：\n  cd', dst, '\n  npm install\n  python score.py && npm run render && python verify.py')
