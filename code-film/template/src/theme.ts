// 視覺：換成你產品的 design token（直接抄產品 CSS 變數，影片才會跟產品同一個樣子）
import { loadFont } from '@remotion/google-fonts/NotoSansTC'

// 中文：NotoSansTC（會自動 delayRender 等字型）；純英文產品可換 Inter 等
export const { fontFamily: FONT } = loadFont('normal', { weights: ['500', '700', '900'], ignoreTooManyRequestsWarning: true })

export const C = {
  bg: '#FBF6EE',        // 舞台底色
  surface: '#FFFDF9',   // 卡片
  ink: '#4A3F35',       // 主文字
  ink2: '#7A6E62',      // 次文字
  ink3: '#A99C8F',      // 弱文字
  line: '#EDE3D6',      // 分隔線／骨架
  accent: '#F0A057',    // 強調色：只給收益時刻
  positive: '#7FB89A',  // 完成／正向
  glow: '#F7D9B8',      // 背景柔光
}

export const shadow = '0 18px 50px rgba(74,63,53,.13), 0 3px 10px rgba(74,63,53,.06)'
