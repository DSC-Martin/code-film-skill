"""成品驗收（機器量測，exit code = 失敗項數）：
1. 規格：解析度、幀率、長度、音軌存在且與畫面等長
2. 轉場不疊影：每個交疊區逐格量「非底色像素比例」，應先降到近 0 再回升
   （兩幕同時半透明可見時不會降到 0，文字會重影）
3. 聲畫同步：timeline.json 裡有 frame 的 bell/pop/chime/arp 事件，音軌起音偏差 ≤ 2 格
4. 靜止段落：最長「完全不動」段 ≤ maxStillSec（有變化的像素 < 0.05% 視為不動；
   只量「有東西在動」會被小元素騙過，量「變化像素比例」才分得出真靜止）
5. 突兀音量：50ms 響度高出前後 1 秒中位數 > maxHitJumpDb 且絕對響度 > hitAbsDb 的單擊
   （一聲特別大 → 正規化後其餘全變小聲）
6. 剪接在拍上（敘事片；timeline 有 bpm 才檢查）：每一幕的 from 距最近的拍 ≤ 1 格
門檻可在 timeline.json 的 "checks" 覆寫：minFirstFrame(0.03)、maxStillSec(3.5)、maxHitJumpDb(20)、hitAbsDb(-9)
第 4–6 項源自 2026-09 程式渲染動畫「第一版常見毛病」與 MoVer（SIGGRAPH 2025）「把要求寫成可執行檢查」
用法：python verify.py [影片路徑，預設 out/film.mp4]
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).parent
MP4 = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'out' / 'film.mp4'
TL = json.loads((HERE / 'src' / 'timeline.json').read_text(encoding='utf-8'))
FPS, W, H = TL['fps'], TL['width'], TL['height']
TOTAL = TL['scenes'][-1]['from'] + TL['scenes'][-1]['dur']
fails = 0
def ok(c, m):
    global fails
    print(f"  {'✓' if c else '✗'} {m}")
    fails += 0 if c else 1

if not MP4.exists():
    print(f'✗ 找不到 {MP4}，先 npm run render'); sys.exit(1)

probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(MP4)]))
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = [s for s in probe['streams'] if s['codec_type'] == 'audio']
num, den = map(int, v['r_frame_rate'].split('/'))
dur = float(probe['format']['duration'])
print('■ 規格')
ok(v['width'] == W and v['height'] == H, f"解析度 {v['width']}×{v['height']}")
ok(abs(num / den - FPS) < 0.01, f'幀率 {num / den:g}')
ok(abs(dur - TOTAL / FPS) < 0.1, f'長度 {dur:.2f}s（預期 {TOTAL / FPS:.2f}s）')
ok(len(a) == 1 and abs(float(a[0]['duration']) - TOTAL / FPS) < 0.1, f"音軌 {len(a)} 條、{float(a[0]['duration']) if a else 0:.2f}s")

raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(MP4), '-vf', 'scale=192:108,format=gray', '-f', 'rawvideo', '-'])
frames = np.frombuffer(raw, np.uint8).reshape(-1, 108, 192).astype(np.int16)
bg = np.median(frames[:, :4, :4])
content = (np.abs(frames - bg) > 18).mean(axis=(1, 2))

print('■ 轉場（兩幕不得同時可見）')
for s in TL['scenes'][1:]:
    seg = content[s['from'] - TL['overlap']: s['from'] + 2]
    k = int(seg.argmin())
    mono = np.all(np.diff(seg[: k + 1]) <= 0.004) and np.all(np.diff(seg[k:]) >= -0.004)
    ok(seg.min() < 0.02 and mono, f"{s['id']:10s} 交疊區谷底內容量 {seg.min():.3f}、先降後升 {'是' if mono else '否'}")

print('■ 聲畫同步')
with wave.open(str(HERE / 'public' / 'score.wav')) as w:
    sr = w.getframerate()
    pcm = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
hop = sr // FPS
env = np.array([np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) for i in range(len(pcm) // hop)])
evs = [s['frame'] for s in TL.get('sounds', []) if 'frame' in s and s['type'] in ('bell', 'pop', 'chime', 'arp')]
# 同一格附近的連續事件只看第一個（後面的起音會被前一個的殘響蓋住）
evs = [e for i, e in enumerate(sorted(evs)) if i == 0 or e - sorted(evs)[i - 1] > 6]
off = [int(np.argmax(np.diff(env[e - 4:e + 4]))) - 3 for e in evs if e >= 4]
ok(off and all(abs(o) <= 2 for o in off), f'{len(off)} 個聲音事件的起音偏差（格）：{off}')

CK = {'minFirstFrame': 0.03, 'maxStillSec': 3.5, 'maxHitJumpDb': 20.0, 'hitAbsDb': -9.0, **TL.get('checks', {})}

print('■ 第一格')
ok(content[0] >= CK['minFirstFrame'], f"第 0 格內容量 {content[0]:.3f}（下限 {CK['minFirstFrame']}；封面與自動播放的第一眼不能是空白）")

print('■ 靜止段落')
raw2 = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(MP4), '-vf', 'scale=384:216,format=gray', '-f', 'rawvideo', '-'])
fr2 = np.frombuffer(raw2, np.uint8).reshape(-1, 216, 384).astype(np.int16)
moving = (np.abs(np.diff(fr2, axis=0)) > 4).mean(axis=(1, 2))
best = cur = end = 0
for i, s in enumerate(moving < 0.0005):
    cur = cur + 1 if s else 0
    if cur > best: best, end = cur, i
where = next((s['id'] for s in TL['scenes'] if s['from'] <= end - best + 1 < s['from'] + s['dur']), '?')
ok(best / FPS <= CK['maxStillSec'], f"最長完全不動 {best / FPS:.2f}s（第 {end - best + 1}–{end} 格，幕 {where}；上限 {CK['maxStillSec']}s）")

print('■ 突兀音量')
h = int(0.05 * sr)
db = 20 * np.log10(np.array([np.sqrt(np.mean(pcm[i:i + h] ** 2)) + 1e-9 for i in range(0, len(pcm) - h, h)]))
ctx = np.array([np.median(np.r_[db[max(0, i - 20):max(0, i - 2)], db[i + 3:i + 21]]) if i > 2 else db[i] for i in range(len(db))])
bad = [i for i in range(len(db)) if db[i] - ctx[i] > CK['maxHitJumpDb'] and db[i] > CK['hitAbsDb']]
worst = int(np.argmax(db - ctx))
ok(not bad, f"突兀單擊 {len(bad)} 處；最大落差 {db[worst] - ctx[worst]:.1f} dB＠{worst * 0.05:.2f}s（絕對 {db[worst]:.1f} dBFS）")

if 'bpm' in TL:
    print('■ 剪接在拍上')
    spb = 60 * FPS / TL['bpm']
    offb = TL.get('beatOffset', 0)
    miss = [(s['id'], s['from']) for s in TL['scenes'][1:] if abs(((s['from'] - offb) / spb) - round((s['from'] - offb) / spb)) * spb > 1]
    ok(not miss, f"{len(TL['scenes']) - 1} 個剪接點，不在拍上 {len(miss)} 個{'：' + str(miss) if miss else ''}（{TL['bpm']} bpm）")

print(f"\n{'✓ 全部通過' if not fails else f'✗ 失敗 {fails} 項'}")
sys.exit(fails)
