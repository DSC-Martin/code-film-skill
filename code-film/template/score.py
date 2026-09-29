"""程式合成配樂：讀 src/timeline.json 的 sounds 與 pad，事件格數與畫面同一份來源 → 聲畫必然同步。
輸出 public/score.wav（48 kHz、16-bit、mono）。用法：python score.py

sounds 支援的 type：
  bell   {frame, note(半音，相對 C5), gain?}   鈴鐺（基音＋泛音＋一個非整數倍泛音）
  pop    {frame, gain?}                         按下／確認
  typing {from, to}                             打字聲（每 3 格一下，隨機略過）
  chime  {frame}                                片尾 C–E–G–C' 琶音
  arp    {frame, notes:[半音...], gain?}        自訂琶音（例：數據長出來時的上行音）
pad：{chords: [[midi...]...], seconds}         和弦底，依序循環；不要就刪掉 pad
"""
import json, sys, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
TL = json.loads((HERE / 'src' / 'timeline.json').read_text(encoding='utf-8'))
SR, FPS = 48000, TL['fps']
TOTAL = TL['scenes'][-1]['from'] + TL['scenes'][-1]['dur']
N = int(TOTAL / FPS * SR)
out = np.zeros(N)
rng = np.random.default_rng(7)
C5 = 523.25
sec = lambda frame: frame / FPS
note = lambda semi: C5 * 2 ** (semi / 12)
hz = lambda midi: 440 * 2 ** ((midi - 69) / 12)

def add(sig, at, gain=1.0):
    i = int(at * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    out[i:j] += sig[: j - i] * gain

def bell(freq, dur=1.6, gain=0.5):
    t = np.arange(int(dur * SR)) / SR
    env = np.exp(-t * 3.2) * np.minimum(1, t / 0.003)
    s = (np.sin(2*np.pi*freq*t) + 0.35*np.sin(2*np.pi*2*freq*t)*np.exp(-t*2)
         + 0.12*np.sin(2*np.pi*3*freq*t)*np.exp(-t*4) + 0.08*np.sin(2*np.pi*4.2*freq*t)*np.exp(-t*6))
    return s * env * gain

def pad_chord(freqs, dur, gain=0.06):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    s = sum(np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*2*f*t + 0.5) for f in freqs)
    return s * (1 + 0.08 * np.sin(2*np.pi*0.25*t)) * env * gain / len(freqs)

def click(gain):
    n = int(0.012 * SR); t = np.arange(n) / SR
    return rng.standard_normal(n) * np.exp(-t * 400) * gain

def pop(gain=0.35):
    t = np.arange(int(0.18 * SR)) / SR
    f = 880 * np.exp(-t * 4)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t * 22) * gain

if 'pad' in TL:
    chords, step = TL['pad']['chords'], TL['pad']['seconds']
    for k in range(int(np.ceil(TOTAL / FPS / step))):
        add(pad_chord([hz(m) for m in chords[k % len(chords)]], step + 1.2), k * step)

for s in TL.get('sounds', []):
    t = s['type']
    if t == 'bell':
        add(bell(note(s['note']), 1.8, s.get('gain', 0.45)), sec(s['frame']))
    elif t == 'pop':
        add(pop(s.get('gain', 0.35)), sec(s['frame']))
    elif t == 'typing':
        for fr in range(s['from'], s['to'], 3):
            if rng.random() < 0.7: add(click(0.035 + 0.02 * rng.random()), sec(fr))
    elif t == 'chime':
        for i, semi in enumerate([0, 4, 7, 12]): add(bell(note(semi), 3.0, 0.3), sec(s['frame']) + i * 0.14)
    elif t == 'arp':
        for i, semi in enumerate(s['notes']): add(bell(note(semi), 1.2, s.get('gain', 0.14)), sec(s['frame']) + i * 0.09)
    else:
        sys.exit(f'未知的 sound type: {t}')

# 殘響（與指數衰減雜訊卷積）
ir_len = int(1.6 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 3.5)
ir /= np.sqrt(np.sum(ir ** 2))
L = 2 ** int(np.ceil(np.log2(N + ir_len)))
wet = np.fft.irfft(np.fft.rfft(out, L) * np.fft.rfft(ir, L))[:N]
mix = out + 0.22 * wet

fade = np.ones(N)
fade[: int(0.4 * SR)] = np.linspace(0, 1, int(0.4 * SR))
fade[-int(2.0 * SR):] = np.linspace(1, 0, int(2.0 * SR))
mix *= fade
mix = mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)   # 正規化到 -1 dBFS

dst = HERE / 'public' / 'score.wav'
dst.parent.mkdir(exist_ok=True)
with wave.open(str(dst), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f'{dst.name}: {N / SR:.2f}s, peak -1 dBFS, {dst.stat().st_size // 1024} KB')
