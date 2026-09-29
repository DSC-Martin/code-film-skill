---
name: code-film
x-source: "original(2026-09-25 產品動畫實戰萃取)+外部案例研究(2026-09-25:Opus 5.5 code-rendered 影片潮流——guizang-product-video-skill、iArt「small print」敘事片、remocn 動態原則、OpenMontage svg-character-animation、MoVer SIGGRAPH 2025;證據等級見 references/research.md)"
x-verified: "2026-09-25"
description: |
  【程式渲染影片】用程式一格一格畫出來的短片(Remotion + Python 合成配樂):不用素材庫、不用 AI 生成影像。
  兩種模式:產品片(功能展示/宣傳/提案)與敘事片(小故事、手繪墨線風、角色動畫、節拍剪接)。
  含流程、踩坑表、機器驗收閘(verify.py:規格/轉場不疊影/聲畫同步/靜止段落/突兀音量/剪接在拍上,exit code)、
  開箱可渲染的樣板與元件庫(手繪墨線、鏡頭、游標、手機框…)。
  Use when: 要做產品宣傳片、產品 demo 動畫、募資／提案影片、品牌故事短片、手繪風或角色動畫、
  「幫 X 做一支像 Opus 5.5 那種動畫」。Remotion API 細節見 https://www.remotion.dev/docs 。
---

# 程式渲染影片(Code Film)

**核心觀念**:模型不產生影片,而是寫一支會渲染影片的程式。畫面=元件逐格渲染(每一格是時間的純函數),
配樂=Python 合成,兩者讀**同一份時間軸 JSON**,所以聲畫天生同步。改文案或節奏=改程式重渲(約 1 分鐘)。

**這波(Opus 5.5)真正的突破**不是新算圖技術,而是模型能當「作者」:長時程維持一支數千行的片子一致、
自己寫分鏡、自己看成品抽格再修(第二輪是修訂不是重來)。但**不是一次生成**——公開案例都至少兩輪,
而且模型預設會走向最平均的版本,**要有人否決平庸處**。詳見 `references/research.md`。

- 範例成品:一支 60 秒九幕的產品片(真資料＋真截圖,verify 全過)
- 敘事片/手繪/角色:`references/narrative.md`;Remotion API:https://www.remotion.dev/docs

## 開新片

```bash
python ~/.claude/skills/code-film/scripts/new_film.py <目標資料夾>
cd <目標資料夾> && npm install
python score.py && npm run render && python verify.py      # 樣板本身就能出片且驗收全過
```

## 選模式

| | 產品片 | 敘事片 |
|---|---|---|
| 目的 | 讓人懂「這產品能做什麼」 | 讓人記得「一個感覺／一個道理」 |
| 結構 | 鉤子→痛點→功能 3–5 幕→全貌→品牌 | 一句話故事＋節拍格(intro→build→peak→ending) |
| 空間 | 一幕一個舞台,SceneShell 換幕 | **一個連續世界**,Camera 移動,少換場 |
| 分鏡檔 | STORYBOARD.md(多一欄「依據」) | STORYBOARD-story.md(節拍格＋鏡頭表) |
| 真實性 | 每句宣稱對到**已上線**功能,示範資料要聲明 | 若涉及真實事件/數據,一樣要出處 |

兩者可以混:產品片的開場用一段敘事(手繪墨線鈴鐺),樣板的 Hook 幕就是示範。

## 六階段

1. **範圍**:對象、長度、比例、語言、有無旁白、模式。預設 1920×1080 · 30fps · 45–60 秒 · 字幕無旁白。
   **直式要重排版,不能從橫式裁**。有合理預設就直接用並講明,真有歧義才問。
2. **真實性**:列出每一句宣稱 → 對到產品已上線功能(程式碼/路由/資料表),對不到的刪;
   畫面數值盡量撈系統真實輸出;不做沒出處的規模/成效宣稱。
3. **分鏡**:產品片一幕一件事、主句 ≤ 16 字;敘事片先節拍後鏡頭(見 narrative.md)。
4. **動態**:先改 `src/timeline.json`(唯一時間來源),再寫幕。關鍵 UI **用程式重畫**(可動畫、銳利),
   廣度畫面才放截圖進 PhoneFrame／BrowserFrame。
5. **聲音**:改 timeline.json 的 `sounds`/`pad`,跑 `python score.py`。
6. **驗收**:`python verify.py` 必須 exit 0 ＋ 抽格總覽肉眼看。**沒跑過 verify 不算完成**。
   第一版給使用者看時,主動點出你覺得平庸的地方並提出第二版方向——不要把第一版當完成品交。

## 驗收閘(verify.py;門檻可在 timeline.json `checks` 覆寫)

| 閘 | 量什麼 | 預設 | 為什麼 |
|---|---|---|---|
| 規格 | 解析度/幀率/長度/音軌同長 | — | |
| 第一格 | 第 0 格非底色像素比例 | ≥ 0.03 | 封面與自動播放第一眼；第一幕 SceneShell 傳 `enter={false}` |
| 轉場不疊影 | 交疊區非底色像素先降到 0 再升 | 谷底 < 0.02 | 兩幕同時半透明=文字重影 |
| 聲畫同步 | 事件格的音軌起音偏差 | ≤ 2 格 | |
| 靜止段落 | 最長「變化像素 < 0.05%」連續段 | ≤ 3.5 秒 | 第一版常見毛病:長段不動 |
| 突兀音量 | 50ms 響度高出前後 1 秒中位數 | > 20 dB 且 > −9 dBFS 即擋 | 一聲特別大,正規化後其餘全變小 |
| 剪接在拍上 | 各幕起點距最近一拍 | ≤ 1 格(有 bpm 才查) | 敘事片的節奏感 |

理論依據:MoVer(SIGGRAPH 2025)——把要求寫成可執行檢查、失敗回饋再修,首次成功率 58.8% → 93.6%。
**想到新的「要什麼」就加一道閘,不要只寫成提醒。**

## 踩坑表(每一條都實際發生過)

| 症狀 | 原因 | 做法 |
|---|---|---|
| 影片第一格是空白底色 | 第一幕也套了 SceneShell 的淡入，主句從第 2 格才進 | 第一幕 `enter={false}`、主句 start 設負值；verify 第一格閘（2026-09-28） |
| 轉場時兩幕文字重影 | 交疊區兩幕同時半透明 | SceneShell:上一幕前 5 格淡完、下一幕第 6 格才進 |
| 畫面長段完全不動(4.27 秒) | 元素落定後沒有後續動作 | SceneShell 內建全域慢推 `drift`(預設 2%);該停的地方也要有生命 |
| 開場一聲特別大(高出 25 dB) | 單一音效增益過高 | 降增益;看 verify 突兀音量 |
| 「靜止」量不準 | 只量平均差異,小元素的動作被稀釋 | 量「變化像素比例」 |
| 雷達／圖表標籤被切 | SVG viewBox 沒留白 | viewBox 四周留 60–80;標籤半徑 ≤ 1.22R |
| 標註壓到圖形 | 錨在資料點 | 錨在軸標籤旁或圖外 |
| 中文副標拆詞(「老／師」) | 自動斷行不懂詞 | 副標用 `\n` 手動斷 |
| 中文字型沒載到 | 未等字型 | `@remotion/google-fonts/NotoSansTC` 的 loadFont(300+ 請求是 CJK 分片,正常) |
| 每次渲染線條長得不一樣 | 用了 Math.random() | `rng(seed)` 固定種子 |
| 截圖在手機框裡很糊／縮圖字看不清 | 1x 截圖／整頁縮小 | `deviceScaleFactor: 3`;裁到重點區域再放大 |
| 聲畫差幾格 | 事件寫兩份 | 只寫在 timeline.json |
| Windows 印 ✓ 報 cp950 | 終端機編碼 | `sys.stdout.reconfigure(encoding='utf-8')` |
| 驗收腳本套到別的片子讀到 0 個事件 | 時間軸格式不同(`events` vs `sounds`) | 通用閘門(靜止/音量)可直接搬,事件類要對格式 |

## 動態原則(kit.tsx 已內建)

- 透明度短曲線(~8 格)、位移長彈簧(約 3 倍長),兩者不共用曲線
- 交錯進場 `base × i^0.8`;強調色只給收益時刻;一幕一個主角在動
- 游標:移動(inOut cubic ~38 格)→ 按下縮 6% → 狀態改變 → 淡出
- 敘事:鏡頭在同一個世界裡移動;線條沸騰(`boil`)讓靜止畫面也活著;角色只動 transform、樞紐點設在關節

## 元件庫(template/src/kit.tsx)

SceneShell・Glow・Caption・Accent・TypeOn・Cursor・PressButton・PhoneFrame・BrowserFrame・ScreenFan・Wordmark・
**rng・InkPath・Camera・beatFrame**・SkeletonUI;工具 `scripts/new_film.py`、`scripts/contact_sheet.py`

## 交付

成品 mp4 放專案的文件/交付資料夾,不進 git(`out/`、`public/score.wav` 已 gitignore);原始碼 commit;
回報附 verify.py 原始輸出當收據。每一格都在動的片子檔案會較大(實測:8 → 18 MB),屬正常。
