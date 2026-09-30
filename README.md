# SNOWMODE — 完整網站草稿（風格 A：沉浸式攝影）

靜態網站，無建置步驟。本機預覽：`python3 -m http.server 8090`（在此資料夾內執行），開啟 http://127.0.0.1:8090/

## 檔案
- `index.html` — 所有區塊（Hero＋快速預約 → 課程方案 → 預約流程 → 教學・教練 → 越後湯澤 → 學員回饋（範例）→ Q&A＋送出預約之後 → 聯絡 → 頁尾）
- `style.css` — 樣式（顏色變數在 `:root`，主色 `--blue`）
- `script.js` — 互動；預約資料集中在 `window.SNOWMODE.booking`
- `img/` — 暫用照片（Unsplash License），來源寫在 `index.html` 開頭註解；上線前替換
- `shoot.py` — 截圖與檢查（Playwright）

## 換 Logo
只要改 header 裡唯一的 `<a class="brand">`：把文字換成 `<img src="img/logo.svg" alt="SNOWMODE">`，高度在 `.brand img` 調整。
（頁尾 `.foot-word` 是裝飾用的大字，可一併替換或保留。）

## 串接後端
`script.js` 內：
- `CONFIG.PRICE_TABLE` — 填入價格（目前全為 `null` → 顯示 ¥XX,XXX）
- `CONFIG.endpoint` + `SNOWMODE.submitBooking(payload)` — 換成真正的 `fetch()`
- `SNOWMODE.buildPayload()` 產生的資料格式：
```json
{ "name": "", "contact": { "method": "LINE", "id": "", "email": "" },
  "dates": [{ "date": "YYYY-MM-DD", "slot": "全日" }],
  "discipline": "雙板", "level": "", "language": "中文", "resort": "由教練建議", "notes": "",
  "adults": 1, "children": 0, "childAges": [], "totalPeople": 1,
  "price": { "currency": "JPY", "amount": null, "display": "¥XX,XXX", "provisional": true,
             "breakdown": { "halfDays": 0, "fullDays": 0, "totalPeople": 1 } },
  "depositRate": 0.3, "deposit": null, "balance": null, "balanceDue": "上課日前一個月內（銀行轉帳或上課當天日幣現金）",
  "submittedAt": "ISO-8601 (UTC)", "source": "snowmode-site" }
```
`adults` 與 `children` 分別記錄大人、小孩人數；`childAges` 為每位小孩的 3–15 歲年齡陣列，`totalPeople` 為兩者總和，至少須有 1 人。價格依 `totalPeople` 與半日／全日時段估算。

`depositRate` 為 30%；當 `price.amount` 有數值時，`deposit` 與 `balance` 會分別記錄訂金與尾款（JPY），否則為 `null`。訂金須於預約確認後以銀行轉帳支付；尾款 70% 可於上課日前一個月內以銀行轉帳支付，或於上課當天在現場以日幣現金支付。取消退款依網站公布政策辦理；若因天候或雪場關閉取消課程，可改期或全額退款。

前端驗證只是輔助，後端仍需自行驗證。
