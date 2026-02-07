# Harmonia

> Fork from: [不囉唆的和弦代號查詢器 by NiceChord 好和弦](https://github.com/wiwikuan/chordfinder)
> Modified by: arWai

---

## 🎵 功能和用法

**Harmonia** 是一個網頁/桌面音樂理論工具，幫助音樂愛好者快速查找和理解和弦結構。

### 核心功能

- **和弦解析**：輸入和弦代號（如 Cmaj7、F#m7b5、Bb13），立即顯示組成音
- **樂譜顯示**：使用 ABC notation 渲染和弦的五線譜顯示
- **調性分析**：選擇調性（如 C Major 或 A Minor），自動顯示正確的音名拼寫
- **和弦進行記錄**：建立並保存和弦進行，可拖放重新排序
- **歷史記錄**：自動保存查詢歷史，一鍵重新檢視

### 如何使用

1. 在「和弦代號」輸入框中輸入和弦名稱
2. 選擇歌曲調性（大調或小調）
3. 即時查看和弦組成音、樂譜顯示和功能分析
4. 點擊「加入」按鈕可保存到歷史記錄或建立和弦進行
5. 使用拖放功能重新排列和弦順序

### 快速開始

- **網頁模式**：執行 `bun run dev` 啟動開發伺服器（`localhost:5173`）
- **桌面應用**：執行 `bun run t:dev` 啟動 Tauri 桌面應用

---

## 🏗️ 使用架構

### 技術架構

**前端**：Vanilla JavaScript + Tailwind CSS v4  
**桌面框架**：Tauri（Rust + Web 技術）  
**音樂理論引擎**：Tonal.js 用於和弦分析  
**樂譜渲染**：abcjs 用於 ABC notation 顯示  
**UI 互動**：SortableJS 實現拖放功能

### 代碼結構

```
harmonia/
├── src/                    # 前端原始碼
│   ├── main.js           # 應用入口點與狀態管理
│   ├── chord-utils.js    # 和弦處理工具（音樂理論）
│   ├── chord-function.js # 和弦功能分析（羅馬數字）
│   ├── drag-utils.js     # 拖放功能封裝
│   └── styles.css        # Tailwind CSS 樣式
├── src-tauri/            # Tauri 桌面應用後端
└── tests/                # 瀏覽器測試框架
```

### 核心方法

1. **工廠模式**：使用 `createStorage()` 和 `createState()` 抽象化狀態管理
2. **純函數**：所有音樂理論邏輯都是純函數，沒有副作用
3. **事件驅動**：採用事件監聽器處理使用者互動
4. **本地儲存**：使用 localStorage 持久化歷史記錄和設定
5. **模組化設計**：每個功能都有獨立的模組，關注點分離

### 開發工作流程

1. **安裝依賴**：`bun install`
2. **開發伺服器**：`bun run dev`（網頁模式）
3. **桌面開發**：`bun run t:dev`（Tauri 模式）
4. **生產建置**：`bun run build`（網頁）或 `bun run t:build`（桌面）
5. **運行測試**：在瀏覽器中開啟 `tests/index.html`

### 推薦 IDE 設定

- [VS Code](https://code.visualstudio.com/) + [Tauri 擴充套件](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

### 設計哲學

- **簡潔直觀**：沒有多餘功能，專注於核心和弦查詢
- **效能優先**：使用純 JavaScript，沒有框架開銷
- **學習工具**：適合音樂學生和作曲者理解和弦結構
- **跨平台**：既是網頁應用，也是桌面應用

### 顏色編碼系統

- **綠色**：主音功能（I, iii, vi）
- **藍色**：下屬功能（ii, IV）
- **紅色**：屬音功能（V, vii°）
