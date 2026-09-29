import React from 'react'
import { Composition } from 'remotion'
import { Film, TOTAL } from './Film'
import TL from './timeline.json'

export const Root: React.FC = () => (
  <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={TL.fps} width={TL.width} height={TL.height} />
)
