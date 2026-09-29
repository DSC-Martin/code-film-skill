# 研究與社群討論（2026-09-25 暴食主鏈加急吸收）

> 檢傷：Tier 1＝同儕審查論文／官方；Tier 2＝有具體實作或可驗證產物的社群文；Tier 3＝一般評論（只取可驗證的說法）。
> 標「未驗證」＝來源自己也說無法查核的宣稱，不要當事實引用。

## 一、Opus 5.5 在這件事上到底突破了什麼

**不是新的算圖技術**——Canvas、SVG、Remotion、Web Audio、ffmpeg 都是老東西。突破在「作者」這一層：

1. **長時程自主撰寫**：一支片是多檔案、數千行、數小時的建置，模型能把它維持一致，
   「第二輪是修訂，不是重來」。還會自己先寫 STORYBOARD.md、再分派子代理分頭實作。
   每個任務的輸出量約 119k tokens（前一代 Opus 5 約 73k）——模型把預算花在自我迭代上。〔Tier 3，orcarouter〕
2. **自己看成品再修（算圖→看格→修）**：寫完會開成品、看抽格總覽、找出破圖或節奏問題再修，
   不需要人每一步介入。〔Tier 2，iArt〕
3. **同一支程式包辦畫面＋聲音＋故事**：無素材庫、無影像生成；畫面與配樂讀同一條時間軸。〔Tier 2〕

**對手工動畫的意義**：只要成品能用程式表示（SVG、Canvas、WebGL、Three.js），
模型就像一個「會寫程式的動畫師＋作曲」。已有公開實例：手繪墨線風短片、2D 角色敘事片、
Blender 骨架綁定與動作（怪物模型 40 分鐘完成跳躍與咬擊）。〔Tier 2–3〕

## 二、要打折扣的地方（網路上的清醒派）

- **「一次生成」不實**：公開的 repo 至少兩輪；分鏡往往是生成後才整理出來。沒有人公布失敗次數與 token 花費。〔orcarouter〕
- **預設會走向最安全、最平均的版本**：需要懂行的人否決平庸版，這一步還沒人自動化。〔newfacedesign〕
- **3 分鐘 AI 史短片**（號稱 ~7,400 行 Remotion）：原始碼未公開、時間軸未經查核——「未驗證」。〔orcarouter 明言〕
- **還是要本機工具鏈**：Node、無頭瀏覽器、ffmpeg；3,760 格要跑一整夜（我們的 1,800 格約 70 秒，差在複雜度）。
- **決定性是硬要求**：每一格必須是時間的純函數——不能帶狀態、不能用沒種子的亂數。
- **著作權**：機器獨立產出的作品在美國的保護有限、仍在爭議中。〔newfacedesign〕

## 三、敘事片的做法（Tier 2，iArt「small print」等實例）

- **節拍格**：先定 BPM 與段落（intro／build／peak／ending），**剪接點落在強拍上**。範例：120 bpm、15 鏡、約 20 個合成音效、14/14 個剪接在拍上。
- **鏡頭表**：10–20 鏡，每鏡有鏡位，**全部在同一個連續世界裡**（鏡頭在世界中移動，而不是換一張張投影片）。
- **事件表**：畫面與聲音共讀同一份事件資料。
- **手繪感**：線條抖動、填色像墨跡——用**固定種子**的亂數產生器，不用 `Math.random()`（否則每次渲染長得不一樣）。
- **字是打出來的，不是畫出來的**：所以拼字永遠正確。
- **提示詞決定風格多於範例圖**：主題與文字最能決定成品樣子；風格預設與範例圖會把一切拉向同一種樣子。
- **第一版常見毛病**（→ 本技能的 verify.py 已把可量的做成閘門）：
  1. 角色用粗圓外框，看起來很幼稚
  2. 文字壓在物件上
  3. 長時間畫面完全不動 → **verify：靜止段落閘**
  4. 配樂裡突兀的大聲單擊 → **verify：突兀音量閘**

## 四、角色動畫（Tier 2，OpenMontage `svg-character-animation` skill，61k★ repo）

- 角色＝多個 SVG 零件；**動 transform（x、y、scale、rotation），不動版面**
- 多零件的表演用時間軸組織
- **樞紐點要穩**：用 `svgOrigin` 或正確的 transform-origin，否則旋轉時零件會飄
- **在 Remotion 裡不要讓 GSAP 自己用 requestAnimationFrame 前進**；用暫停的時間軸，由目前格數驅動

## 五、學術研究（Tier 1）

- **MoVer**（SIGGRAPH 2025／ACM TOG）：一階邏輯的「動態驗證語言」，檢查空間關係、時序、方向、重疊／包含。
  LLM 同時產生動畫與驗證程式 → 執行 → 失敗的謂詞回饋給 LLM 修。
  GPT-4o 首次成功率 58.8% → 加驗證迭代後 93.6%。
  **這就是本技能 verify.py 的理論依據**：把「要什麼」寫成可執行的檢查，比寫成提醒有效。
  https://mover-dsl.github.io/ · https://github.com/jama1017/MoVer
- **LogoMotion**（2024）：視覺落地的程式合成——先算圖、看畫面，再改動畫程式。
- **Keyframer**（Apple，2024）：LLM 產生 CSS 動畫的設計工具；研究設計師如何下提示、如何探索變體。https://arxiv.org/abs/2402.06071
- **MG-Gen**（2025）：單張圖 → 動態圖形。https://arxiv.org/pdf/2504.02361
- **2.5D 兒童畫角色骨架動畫**（2025）：https://arxiv.org/html/2502.17866v1

## 來源

- https://www.orcarouter.ai/blog/claude-opus-5-5-product-video-skill
- https://www.orcarouter.ai/blog/claude-opus-5-5-video-plan-one-shot
- https://www.orcarouter.ai/blog/claude-opus-5-5-code-rendered-ai-history-film
- https://www.iart.ai/blog/ai-javascript-animation
- https://newfacedesign.com/blog/claude-opus-5-5-art-animation-from-code
- https://remocn.dev/blog/claude-opus-5-launch-video
- https://www.skills.sh/calesthio/openmontage/svg-character-animation
- https://x.com/Voxyz_ai/status/2102531681450119426（small print）
- https://github.com/magiccreator-ai/awesome-claude-opus-5-5-demos
