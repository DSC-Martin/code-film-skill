/**
 * 產品片元件庫（不綁任何產品）。萃取自一支產品動畫實戰（2026-09）。
 * 動態原則：透明度短曲線、位移長彈簧；交錯 base×i^0.8；強調色只給收益時刻。
 */
import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, FONT, shadow } from './theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export const fadeIn = (f: number, start: number, len = 8) =>
  interpolate(f, [start, start + len], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) })

export const stagger = (i: number, base = 5) => Math.round(base * Math.pow(i, 0.8))

export const useSpring = (start: number, damping = 18, stiffness = 110) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  return spring({ frame: f - start, fps, config: { damping, stiffness, mass: 0.9 } })
}

/**
 * 場景外殼。交疊區（timeline.overlap 格）內：
 * 上一幕前 5 格淡完並上飄、下一幕第 6 格才淡入上升 → 兩幕永不同時可見（否則文字重影）。
 * 內部動畫從第 0 格就在跑，所以不會空白進場。
 */
export const SceneShell: React.FC<{ dur: number; exitLen?: number; bg?: string; drift?: number; enter?: boolean; children: React.ReactNode }> = ({
  dur, exitLen = 12, bg = C.bg, drift = 0.02, enter: entering = true, children,
}) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  const exit = interpolate(f, [dur - exitLen, dur - exitLen + 5], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
  // 第一幕傳 enter={false}：影片第 0 格就要有畫面（封面、自動播放的第一眼不能是空白）
  const enter = entering ? fadeIn(f, 6, 8) : 1
  const rise = entering ? spring({ frame: f - 6, fps, config: { damping: 20, stiffness: 90 } }) : 1
  // 全域慢推：整幕從 100% 緩推到 100+drift%，鏡頭永不完全靜止（verify 靜止閘）
  const scale = 1 + drift * (f / dur)
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.ink, opacity: enter * (1 - exit),
      transform: `translateY(${(1 - rise) * 34 - exit * 26}px) scale(${scale})` }}>
      <AbsoluteFill style={{ background: bg }} />
      {children}
    </AbsoluteFill>
  )
}

/** 柔光背景：讓整支片像在同一個舞台上 */
export const Glow: React.FC<{ x?: string; y?: string; color?: string }> = ({ x = '75%', y = '30%', color = C.glow }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at ${x} ${y}, ${color}88 0%, transparent 55%)` }} />
)

/** 字幕：主句逐行浮上，副句延遲；副句用 \n 手動斷行（中文自動斷行會拆詞） */
export const Caption: React.FC<{
  lines: React.ReactNode[]; sub?: string; start?: number; align?: 'left' | 'center'; size?: number; style?: React.CSSProperties
}> = ({ lines, sub, start = 6, align = 'left', size = 72, style }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  return (
    <div style={{ textAlign: align, ...style }}>
      {lines.map((t, i) => {
        const s = start + stagger(i, 10)
        const y = spring({ frame: f - s, fps, config: { damping: 20, stiffness: 100 } })
        return (
          <div key={i} style={{ fontSize: size, fontWeight: 900, lineHeight: 1.28, opacity: fadeIn(f, s),
            transform: `translateY(${(1 - y) * 36}px)` }}>{t}</div>
        )
      })}
      {sub && (
        <div style={{ marginTop: 22, fontSize: size * 0.42, fontWeight: 500, color: C.ink2, lineHeight: 1.6,
          whiteSpace: 'pre-line', textWrap: 'balance' as React.CSSProperties['textWrap'],
          opacity: fadeIn(f, start + stagger(lines.length, 10) + 6, 12) }}>{sub}</div>
      )}
    </div>
  )
}

export const Accent: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: C.accent }}>{children}</span>

/** 逐字打出（含游標閃爍）；回傳是否打完，方便切換狀態標籤 */
export const TypeOn: React.FC<{ text: string; start: number; end: number; style?: React.CSSProperties }> = ({ text, start, end, style }) => {
  const f = useCurrentFrame()
  const n = Math.round(interpolate(f, [start, end], [0, text.length], clamp))
  return (
    <div style={style}>
      {text.slice(0, n)}
      {f < end && <span style={{ display: 'inline-block', width: 3, height: '1.1em', background: C.accent, marginLeft: 4,
        verticalAlign: 'middle', opacity: Math.floor(f / 8) % 2 }} />}
    </div>
  )
}

/** 游標：從 from 移到 to，在 pressAt 按下；按下後 20 格淡出 */
export const Cursor: React.FC<{ from: [number, number]; to: [number, number]; pressAt: number }> = ({ from, to, pressAt }) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [pressAt - 44, pressAt - 6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const x = interpolate(p, [0, 1], [from[0], to[0]]), y = interpolate(p, [0, 1], [from[1], to[1]])
  const out = interpolate(f, [pressAt + 20, pressAt + 30], [1, 0], clamp)
  return (
    <svg width={56} height={56} viewBox="0 0 24 24" style={{ position: 'absolute', left: x, top: y,
      opacity: fadeIn(f, pressAt - 50, 8) * out, transform: `scale(${f >= pressAt && f < pressAt + 6 ? 0.85 : 1})`,
      filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))' }}>
      <path d="M4 2l15 11-6.5 1.2L16 21l-3 1.3-3.5-6.8L4 20z" fill="#fff" stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  )
}

/** 按鈕：pressAt 之後切成 done 狀態並彈一下 */
export const PressButton: React.FC<{ label: string; doneLabel: string; pressAt: number; style?: React.CSSProperties }> = ({ label, doneLabel, pressAt, style }) => {
  const f = useCurrentFrame()
  const done = f >= pressAt
  const b = useSpring(pressAt, 8, 260)
  return (
    <div style={{ display: 'inline-block', padding: '18px 40px', borderRadius: 18, fontSize: 32, fontWeight: 900, color: '#fff',
      background: done ? C.positive : C.accent, transform: `scale(${done ? 0.94 + 0.06 * b : 1})`, ...style }}>
      {done ? doneLabel : label}
    </div>
  )
}

/** 手機框：src 為長截圖（建議 deviceScaleFactor 3 拍），scroll 為捲動距離（px，已依框寬換算） */
export const PhoneFrame: React.FC<{ src?: string; imgW?: number; imgH?: number; scroll?: number; x: number; y: number; w?: number; h?: number; children?: React.ReactNode }> = ({
  src, imgW = 1170, imgH = 2532, scroll = 0, x, y, w = 420, h = 880, children,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w + 32, height: h + 32, padding: 16, borderRadius: 64,
    background: '#2A2420', boxShadow: '0 40px 90px rgba(40,30,20,.30)' }}>
    <div style={{ width: w, height: h, borderRadius: 48, overflow: 'hidden', background: C.bg, position: 'relative' }}>
      {src ? <Img src={staticFile(src)} style={{ width: w, height: imgH * (w / imgW), position: 'absolute', top: -scroll }} /> : children}
    </div>
  </div>
)

/** 瀏覽器框：放截圖或自畫 UI */
export const BrowserFrame: React.FC<{ src?: string; x: number; y: number; w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  src, x, y, w, h, children, style,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, borderRadius: 22, overflow: 'hidden', background: C.surface,
    boxShadow: shadow, border: `2px solid ${C.line}`, ...style }}>
    <div style={{ display: 'flex', gap: 9, padding: '14px 18px', borderBottom: `2px solid ${C.line}` }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 13, height: 13, borderRadius: 7, background: C.line }} />)}
    </div>
    <div style={{ width: w, height: h - 44, position: 'relative', overflow: 'hidden' }}>
      {src ? <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} /> : children}
    </div>
  </div>
)

/** 多張畫面扇形展開（全貌幕） */
export const ScreenFan: React.FC<{ items: { src?: string; label: string; node?: React.ReactNode }[]; start?: number; top?: number }> = ({
  items, start = 14, top = 390,
}) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  const n = items.length, spread = 560
  const order = items.map((_, i) => i).sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2)) // 中間最後進、疊最上
  return (
    <>
      {order.map((i, k) => {
        const it = items[i]
        const off = (i - (n - 1) / 2)
        const s = spring({ frame: f - start - stagger(k, 8), fps, config: { damping: 17 } })
        return (
          <div key={i} style={{ position: 'absolute', left: 960 - 380 + off * spread * s, top: top + (1 - s) * 200, width: 760,
            transform: `rotate(${off * 6 * s}deg)`, opacity: fadeIn(f, start + stagger(k, 8)) }}>
            <div style={{ borderRadius: 22, overflow: 'hidden', boxShadow: shadow, border: `2px solid ${C.line}`, background: C.surface, height: 475 }}>
              {it.src ? <Img src={staticFile(it.src)} style={{ width: 760, height: 475, display: 'block' }} /> : it.node}
            </div>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 30, fontWeight: 900 }}>{it.label}</div>
          </div>
        )
      })}
    </>
  )
}

/** 品牌字標：逐字彈入；accentFrom 之後的字用強調色 */
export const Wordmark: React.FC<{ text: string; start: number; accentFrom?: number; size?: number }> = ({ text, start, accentFrom = 99, size = 170 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  return (
    <div style={{ display: 'flex', fontSize: size, fontWeight: 900 }}>
      {[...text].map((ch, i) => {
        const s = spring({ frame: f - start - stagger(i, 3), fps, config: { damping: 12, stiffness: 140 } })
        return <span key={i} style={{ color: i >= accentFrom ? C.accent : C.ink, whiteSpace: 'pre', display: 'inline-block',
          opacity: fadeIn(f, start + stagger(i, 3), 6), transform: `translateY(${(1 - s) * 60}px)` }}>{ch}</span>
      })}
    </div>
  )
}

/* ─────────── 敘事片工具（手繪感／鏡頭／節拍）─────────── */

/**
 * 固定種子亂數（mulberry32）。畫面必須是格數的純函數：禁用 Math.random()，
 * 否則每次渲染、每個平行分頁畫出來的線都不一樣。
 */
export const rng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * 手繪墨線：把折線細分後加固定種子抖動，雙筆觸疊出墨跡感；progress 0→1 逐步畫出。
 * boil>0 時每 boil 格換一次種子＝傳統手繪動畫的「線條沸騰」（約 12fps 的微抖）。
 */
export const InkPath: React.FC<{
  points: [number, number][]; progress?: number; seed?: number; wobble?: number; width?: number
  color?: string; boil?: number; closed?: boolean; fill?: string
}> = ({ points, progress = 1, seed = 1, wobble = 3, width = 5, color = C.ink, boil = 0, closed = false, fill = 'none' }) => {
  const f = useCurrentFrame()
  const s = seed + (boil > 0 ? Math.floor(f / boil) : 0)
  const pts = closed ? [...points, points[0]] : points
  const stroke = (k: number) => {
    const r = rng(s * 7 + k)
    const out: [number, number][] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
      const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 18))
      for (let j = 0; j < n; j++) {
        const t = j / n
        out.push([x0 + (x1 - x0) * t + (r() - 0.5) * wobble, y0 + (y1 - y0) * t + (r() - 0.5) * wobble])
      }
    }
    out.push(pts[pts.length - 1])
    let len = 0
    for (let i = 1; i < out.length; i++) len += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1])
    return { d: 'M' + out.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'), len }
  }
  const a = stroke(1), b = stroke(2)
  const p = Math.max(0, Math.min(1, progress))
  return (
    <g>
      {fill !== 'none' && p >= 1 && <path d={a.d + ' Z'} fill={fill} stroke="none" />}
      <path d={a.d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={a.len} strokeDashoffset={a.len * (1 - p)} />
      <path d={b.d} fill="none" stroke={color} strokeWidth={width * 0.45} strokeLinecap="round" opacity={0.45}
        strokeDasharray={b.len} strokeDashoffset={b.len * (1 - p)} />
    </g>
  )
}

/**
 * 鏡頭：整個世界放在一個容器裡，依關鍵格在世界中推移／縮放（一個連續世界，不是一張張投影片）。
 * keys: [{frame, x, y, zoom}]，x/y 為鏡頭對準的世界座標（1920×1080 為一個畫面寬高）。
 */
export const Camera: React.FC<{ keys: { frame: number; x: number; y: number; zoom: number }[]; children: React.ReactNode }> = ({ keys, children }) => {
  const f = useCurrentFrame()
  const fr = keys.map((k) => k.frame)
  const opt = { ...clamp, easing: Easing.inOut(Easing.cubic) }
  const x = keys.length > 1 ? interpolate(f, fr, keys.map((k) => k.x), opt) : keys[0].x
  const y = keys.length > 1 ? interpolate(f, fr, keys.map((k) => k.y), opt) : keys[0].y
  const z = keys.length > 1 ? interpolate(f, fr, keys.map((k) => k.zoom), opt) : keys[0].zoom
  return (
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - x * z}px, ${540 - y * z}px) scale(${z})` }}>
      {children}
    </AbsoluteFill>
  )
}

/** 節拍 → 格數：剪接點與重拍對齊（第 n 拍，bpm，起點偏移 offset 格） */
export const beatFrame = (n: number, bpm: number, fps = 30, offset = 0) => offset + Math.round((n * 60 * fps) / bpm)

/** 占位 UI（樣板用；換成你的產品畫面） */
export const SkeletonUI: React.FC = () => (
  <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
    <div style={{ display: 'flex', gap: 16 }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 110, borderRadius: 16, background: C.bg }} />)}
    </div>
    <div style={{ height: 180, borderRadius: 16, background: C.bg }} />
    {[88, 72, 80].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 16, borderRadius: 8, background: C.line }} />)}
  </div>
)
