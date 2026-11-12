# 中華虛擬航空 官方網站

本站使用 [Eleventy](https://www.11ty.dev/) 產生靜態頁面，
由 GitHub Actions 建置 `_site/` 後部署到 GitHub Pages。

> ⚠️ Repo 根目錄**不再**放 `index.html`、`flight-history-*.html`、`sitemap.xml`，
> 這些檔案都是建置產生的。要改內容請改 `_data/` 與 `pages/`。

## 目錄結構

| 路徑 | 用途 |
| --- | --- |
| `_data/site.json` | 站台設定：網址、社群連結、合作夥伴、統計頁籤 |
| `_data/flights.json` | **聯飛紀錄清單（唯一來源）** |
| `_data/i18n.json` | 中／英文介面字串 |
| `_includes/` | 共用版型與 header / footer / 隱私權區塊 |
| `pages/index.njk` | 首頁模板，會產生 `index.html` 與 `index-en.html` |
| `pages/flight-history.njk` | 聯飛紀錄模板，每筆 flight 產生一頁 |
| `pages/sitemap.njk` | 產生 `sitemap.xml` |
| `assets/` | 圖片、CSS、JS、資料檔（原樣複製到網站） |

## 如何新增一場聯飛紀錄

1. 把該場聯飛的時間軸放到 `assets/timeline/timeline-YYYYMMDD.json`
2. 在 `_data/flights.json` 加一筆：

   ```json
   {
     "id": "20260822",
     "date": "2026-08-22",
     "listed": true,
     "title": { "zh-TW": "活動名稱", "en": "Event name" },
     "image": null,
     "lines": {
       "zh-TW": ["活動說明第一行", "活動說明第二行"],
       "en": ["Line one", "Line two"]
     },
     "timeline": "assets/timeline/timeline-20260822.json",
     "map": { "lat": 24.0, "lon": 116.7, "zoom": 6 }
   }
   ```

   - 若說明是一張圖，把 `image` 設成圖片路徑（例如 `assets/img/flight-history/20260822.png`），`lines` 留空陣列。
   - `listed` 設為 `false` 時該頁仍會產生，但不會出現在其他頁的「其他聯飛紀錄」按鈕清單。

3. Commit 並 push。

導覽列連結、首頁的聯飛地圖、每一頁的「其他聯飛紀錄」按鈕清單、`sitemap.xml`
都會依照 `date` 最新的一筆自動更新，不需要手動改任何 HTML。

## 如何更新成員名單

1. 下載最新[成員名單](https://raw.githubusercontent.com/China-Airlines-Virtual/China-Airlines-Virtual.github.io/main/assets/members.csv)
2. 用 Excel 打開並按照格式編輯（切勿任意新增直行）

**注意：最第一欄的id，請依序增加並不可重複，若成員離開讓他空號即可**
3. 打開[網頁](https://github.com/China-Airlines-Virtual/China-Airlines-Virtual.github.io/tree/main/assets)，點擊 `Add file` -> `Upload files`
![image](.github/add-file.png)
4. 將剛剛編輯的 `members.csv` 拖到方塊中，在 Commit changes 欄位填寫 `chore: update members data`，然後點擊 `Commit changes`
![image](.github/commit-file.png)

## 本機開發

```bash
npm install
npm start     # http://localhost:8080，存檔自動重新整理
npm run build # 產生 _site/
```

## 部署

`.github/workflows/deploy.yml` 會在 push 到 `main` 時建置並部署。

- **Repo 設定需求**：Settings → Pages → Source 必須設為 **GitHub Actions**。
- `assets/statistics.json` 由另一個 repo 的 Action 以 PAT commit，
  PAT 推送的 commit 會觸發本 repo 的 workflow，所以統計更新後會自動重新部署。
- 另外設有每日排程與 `workflow_dispatch`，可在 PAT 失效時作為備援或手動重跑。

## 首頁（一頁一頁滑動版）與後台管理

- 首頁模板是 `pages/index.njk`，版型 `_includes/layouts/slides.njk`，樣式 `assets/css/slides.css`，互動 `assets/js/slides.js`。
  統計數字與前 5 名仍然讀 `assets/statistics.json` 與 `assets/members.csv`。
- **背景影片**：把影片放到 `assets/video/hero.mp4`（規格見該資料夾的 README.txt）。檔案不存在時會退回 `_data/site.json` 的 YouTube 影片。
- **後台**：`/admin.html`，管理員登入後可管理「活動公告」與首頁部分文字、圖片。資料存在 Supabase：
  1. 在 Supabase SQL Editor 執行 `supabase/setup.sql`（可重複執行）。
  2. 在 Authentication → Users 建立管理員帳號，再用 setup.sql 最後一段把他加進 `admins`。
  3. 把 Project URL 與**公開** anon/publishable 金鑰填進 `assets/js/site-config.js`（不要填 service_role / secret 金鑰）。
- 新增可由後台編輯的文字：在 `pages/index.njk` 的元素加上 `data-key="欄位代號"`（圖片用 `data-img-key`），並把欄位加進 `admin.html` 裡的 `FIELDS`。後台文字只套用在中文版首頁。

## 會員數位識別證（vAMSYS 登入）

- 程式：`assets/js/member.js`，設定在 `assets/js/site-config.js` 的 `vamsys`。流程是 OAuth 授權碼 + PKCE（公開客戶端，**不使用 client secret**）。
- vAMSYS 後台登記的「重新導向網址」必須與 `redirectUri` 一字不差（留空時為網站根網址，例如 `https://china-airlines-virtual.github.io/`，包含最後的斜線）。
- 權杖與資料只存在使用者瀏覽器的 sessionStorage，不會寫入 Supabase 或任何資料庫。
- 如果瀏覽器因跨網域限制無法直接呼叫 vAMSYS，需要改由 Supabase Edge Function 代為換權杖與取資料。

### 備用：Supabase Edge Function（`supabase/functions/vamsys-proxy`）

只有在瀏覽器擋住直接呼叫 vAMSYS 時才需要。部署後把函式網址填進 `site-config.js` 的 `vamsys.proxyUrl`，
並在 Edge Functions → Secrets 設定 `VAMSYS_CLIENT_ID` 與 `ALLOWED_ORIGINS`；函式需關閉 "Verify JWT"。
