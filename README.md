# SNOWMODE — 完整網站草稿（風格 A：沉浸式攝影）

靜態網站，無建置步驟。本機預覽：`python3 -m http.server 8090`（在此資料夾內執行），開啟 http://127.0.0.1:8090/

## 檔案
- `index.html` — 所有區塊（Hero＋快速預約 → 課程方案 → 預約流程 → 教學・教練 → 越後湯澤 → 學員回饋（範例）→ Q&A＋送出預約之後 → 聯絡 → 頁尾）
- `style.css` — 樣式（顏色變數在 `:root`，主色 `--blue`）
- `script.js` — 互動；預約資料集中在 `window.SNOWMODE.booking`
- `img/` — 首頁照片 hero-yuzawa.jpg 為 CC BY 2.0（Takuya ASADA，頁尾已標示）；其他暫用照片為 Unsplash License，來源寫在 `index.html` 開頭註解；上線前替換
- `shoot.py` — 截圖與檢查（Playwright）

## 換 Logo
只要改 header 裡唯一的 `<a class="brand">`：把文字換成 `<img src="img/logo.svg" alt="SNOWMODE">`，高度在 `.brand img` 調整。
（頁尾 `.foot-word` 是裝飾用的大字，可一併替換或保留。）

## 串接後端
`script.js` 內：
- `CONFIG.PRICE_TABLE` — 早鳥回饋價 2026–27（NT$，整組總價；`half`/`full` 依總人數 1–4 人，5 人以上顯示「5 人以上請私訊報價」）
- `CONFIG.endpoint` + `SNOWMODE.submitBooking(payload)` — 換成真正的 `fetch()`
- `SNOWMODE.buildPayload()` 產生的資料格式：
```json
{ "name": "", "contact": { "method": "LINE", "id": "", "email": "" },
  "dates": [{ "date": "YYYY-MM-DD", "slot": "全日" }],
  "discipline": "雙板", "level": "", "language": "中文", "resort": "由教練建議", "notes": "",
  "adults": 1, "children": 0, "childAges": [], "totalPeople": 1,
  "price": { "currency": "TWD", "label": "早鳥回饋價 2026–27", "amount": 12000, "display": "NT$12,000",
             "deposit": 3600, "balance": 8400, "depositDisplay": "NT$3,600", "balanceDisplay": "NT$8,400",
             "quoteRequired": false, "duration": "full", "durationLabel": "全日（6 小時，含午休 1 小時） × 1 天",
             "breakdown": { "halfDays": 0, "fullDays": 1, "totalPeople": 1 } },
  "duration": "full", "durationLabel": "全日（6 小時，含午休 1 小時） × 1 天",
  "depositRate": 0.3, "deposit": 3600, "balance": 8400, "balanceDue": "於上課前結清",
  "submittedAt": "ISO-8601 (UTC)", "source": "snowmode-site" }
```
`adults` 與 `children` 分別記錄大人、小孩人數；`childAges` 為每位小孩的 3–15 歲年齡陣列，`totalPeople` 為兩者總和，至少須有 1 人。價格依 `totalPeople` 與半日／全日時段估算。

`depositRate` 為 30%；當 `price.amount` 有數值時，`deposit` 與 `balance` 會分別記錄訂金與尾款（NT$，四捨五入至整數元），否則為 `null`（例如 5 人以上需私訊報價）。預約確認後支付總價 30% 訂金，尾款於上課前結清；付款方式與相關資訊將由教練另行提供。取消退款依網站公布政策辦理；若因天候或雪場關閉取消課程，可改期或全額退款。

前端驗證只是輔助，後端仍需自行驗證。
