import React from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import TL from './timeline.json'
import { C } from './theme'
import { SCENES } from './Scenes'

/** 單一舞台：每一幕提早 overlap 格進場，與上一幕的出場交疊（SceneShell 保證兩幕不同時可見） */
export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {TL.scenes.map((s) => {
      const t0 = Math.max(0, s.from - TL.overlap)
      const dur = s.dur + (s.from - t0)
      const Scene = SCENES[s.id]
      if (!Scene) throw new Error(`timeline.json 的幕 "${s.id}" 在 Scenes.tsx 的 SCENES 裡找不到`)
      return (
        <Sequence key={s.id} from={t0} durationInFrames={dur} name={s.id}>
          <Scene dur={dur} t0={t0} />
        </Sequence>
      )
    })}
    <Audio src={staticFile('score.wav')} />
  </AbsoluteFill>
)

export const TOTAL = TL.scenes.at(-1)!.from + TL.scenes.at(-1)!.dur
