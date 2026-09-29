/**
 * 樣板六幕：鉤子 → 痛點 → 功能（打字）→ 功能（點擊）→ 全貌 → 收尾。
 * 全部用 kit.tsx 元件，不需任何素材就能渲染；換成你的產品時：
 *   - 文案：改各幕的 Caption
 *   - 畫面：SkeletonUI 換成程式重畫的產品 UI，或 BrowserFrame/PhoneFrame 的 src 放截圖（public/）
 *   - 時間：只改 timeline.json（事件格數從那裡讀，聲音跟著走）
 */
import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import TL from './timeline.json'
import { C, shadow } from './theme'
import {
  Accent, BrowserFrame, Camera, Caption, Cursor, Glow, InkPath, PressButton, SceneShell, ScreenFan, SkeletonUI, TypeOn, Wordmark,
  fadeIn, useSpring,
} from './kit'

export type SceneProps = { dur: number; t0: number }
const local = (abs: number, t0: number) => abs - t0
const sound = (type: string, i = 0) => TL.sounds.filter((s) => s.type === type)[i] as { frame?: number; from?: number; to?: number }

// 手繪鈴鐺輪廓（世界座標；畫面中心 960,540）
const BELL: [number, number][] = [[930, 300], [990, 300], [990, 322], [1040, 342], [1072, 402], [1082, 492], [1124, 556],
  [796, 556], [838, 492], [848, 402], [880, 342], [930, 322]]

/** 鉤子：手繪墨線逐筆畫出鈴鐺（線條沸騰）→ 敲響時上色＋漣漪；鏡頭同時緩推。示範 InkPath／Camera */
export const Hook: React.FC<SceneProps> = ({ dur, t0 }) => {
  const f = useCurrentFrame()
  const hit = local(sound('bell').frame!, t0)
  const lit = f >= hit
  const pop = useSpring(hit, 9, 180)
  const draw = interpolate(f, [-50, hit - 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) })
  const ring = interpolate(f, [hit, hit + 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const sc = lit ? 1 + 0.05 * (1 - pop) : 1
  return (
    <SceneShell dur={dur} enter={false}>
      <Glow x="50%" y="42%" />
      <Camera keys={[{ frame: 0, x: 960, y: 470, zoom: 1.18 }, { frame: dur, x: 960, y: 520, zoom: 1.0 }]}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <g transform={`translate(960 430) scale(${sc}) translate(-960 -430)`}>
            {lit && <circle cx={960} cy={430} r={140 + ring * 170} fill="none" stroke={C.accent} strokeWidth={8 * (1 - ring)} opacity={1 - ring} />}
            <InkPath points={BELL} closed progress={draw} seed={3} wobble={4} width={7} boil={4}
              fill={lit ? C.accent : 'none'} color={C.ink} />
            <InkPath points={[[950, 556], [960, 590], [970, 556]]} progress={lit ? 1 : 0} seed={9} width={7} />
          </g>
        </svg>
      </Camera>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 190 }}>
        <Caption lines={['一句話說出你的產品鉤子']} start={-30} align="center" />
      </AbsoluteFill>
    </SceneShell>
  )
}

export const Pain: React.FC<SceneProps> = ({ dur }) => (
  <SceneShell dur={dur}>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Caption lines={['使用者現在卡在哪裡？', '用一句話講痛點。']} sub="副句補一個具體情境" align="center" size={84} start={8} />
    </AbsoluteFill>
  </SceneShell>
)

export const TypeScene: React.FC<SceneProps> = ({ dur, t0 }) => {
  const f = useCurrentFrame()
  const t = sound('typing')
  const s = local(t.from!, t0), e = local(t.to!, t0)
  const card = useSpring(8, 20)
  return (
    <SceneShell dur={dur}>
      <Glow x="72%" y="40%" />
      <div style={{ position: 'absolute', left: 140, top: 340, width: 620 }}>
        <Caption lines={['功能一：', <>自動<Accent>產生</Accent>內容</>]} sub={'副句說明這個功能\n解決了什麼'} start={4} size={76} />
      </div>
      <BrowserFrame x={820} y={180 + (1 - card) * 70} w={960} h={640} style={{ opacity: fadeIn(f, 8) }}>
        <div style={{ padding: '40px 48px' }}>
          <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 999, fontSize: 22, fontWeight: 900,
            background: f < e ? `${C.accent}33` : `${C.positive}33`, color: f < e ? C.accent : C.positive, marginBottom: 22 }}>
            {f < e ? '產生中…' : '完成'}
          </div>
          <TypeOn start={s} end={e} text="這裡放你的產品實際產出的一段文字，建議直接從系統撈真實輸出，而不是自己編。"
            style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.75 }} />
        </div>
      </BrowserFrame>
    </SceneShell>
  )
}

export const ClickScene: React.FC<SceneProps> = ({ dur, t0 }) => {
  const f = useCurrentFrame()
  const press = local(sound('pop').frame!, t0)
  return (
    <SceneShell dur={dur}>
      <Glow x="68%" y="45%" />
      <div style={{ position: 'absolute', left: 140, top: 340, width: 620 }}>
        <Caption lines={['功能二：', '一鍵完成']} sub="副句說明按下之後發生什麼" start={4} size={76} />
      </div>
      <div style={{ position: 'absolute', left: 820, top: 330, width: 960, padding: '40px 44px', borderRadius: 30, background: C.surface, boxShadow: shadow, opacity: fadeIn(f, 6) }}>
        <div style={{ fontSize: 36, fontWeight: 900 }}>待處理的一個項目</div>
        <div style={{ marginTop: 16, height: 16, width: '88%', borderRadius: 8, background: C.line }} />
        <div style={{ marginTop: 12, height: 16, width: '72%', borderRadius: 8, background: C.line }} />
        <div style={{ marginTop: 36 }}><PressButton label="確認" doneLabel="✓ 已完成" pressAt={press} /></div>
      </div>
      <Cursor from={[1640, 900]} to={[905, 575]} pressAt={press} />
    </SceneShell>
  )
}

export const Overview: React.FC<SceneProps> = ({ dur }) => (
  <SceneShell dur={dur}>
    <Glow x="50%" y="70%" />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 80 }}>
      <Caption lines={['全貌：同一套系統']} sub="副句列出涵蓋的角色或模組" align="center" size={70} start={4} />
    </div>
    <ScreenFan items={[
      { label: '畫面 A', node: <SkeletonUI /> },
      { label: '畫面 B', node: <SkeletonUI /> },
      { label: '畫面 C', node: <SkeletonUI /> },
    ]} />
  </SceneShell>
)

export const Outro: React.FC<SceneProps> = ({ dur, t0 }) => {
  const f = useCurrentFrame()
  const hit = local(sound('chime').frame!, t0)
  return (
    <SceneShell dur={dur} exitLen={1}>
      <Glow x="50%" y="45%" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Wordmark text="Brand" start={hit} accentFrom={2} />
        <div style={{ marginTop: 18, fontSize: 56, fontWeight: 900, opacity: fadeIn(f, hit + 34, 12) }}>一句品牌標語</div>
        <div style={{ marginTop: 34, fontSize: 34, fontWeight: 700, color: C.accent, opacity: fadeIn(f, hit + 52, 12) }}>example.com</div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', bottom: 46, width: '100%', textAlign: 'center', fontSize: 22, color: C.ink3, opacity: fadeIn(f, hit + 60, 12) }}>
        用了示範資料就在這裡聲明（例：畫面資料為示範用）
      </div>
    </SceneShell>
  )
}

export const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: Hook, pain: Pain, type: TypeScene, click: ClickScene, overview: Overview, outro: Outro,
}
