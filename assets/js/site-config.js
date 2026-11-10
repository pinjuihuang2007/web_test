// 後台（Supabase）連線設定。
// 位置：Supabase 專案 → Project Settings → API
// 這裡只能填「公開金鑰」（anon / publishable key）。
// 絕對不要填 service_role 或 secret 金鑰，那種金鑰一旦公開，別人就能改掉所有資料。
// 尚未設定時（維持 YOUR- 開頭），網站會正常顯示預設內容，只是沒有活動公告。
window.SITE_CONFIG = {
  url: "https://zuiyduedpvnqrzfnclqn.supabase.co",
  anonKey: "sb_publishable_rKPJH-377ET3VSiFuNIVGg_BHiJLLgS",

  // vAMSYS 機師登入（授權碼 + PKCE，公開客戶端，不需要也絕對不能放 client secret）
  vamsys: {
    clientId: "1364",
    // 必須與 vAMSYS 後台登記的「重新導向網址」一字不差（包含最後的斜線）。
    // 留空＝使用目前網站的根網址，例如 https://china-airlines-virtual.github.io/
    redirectUri: "",
    scope: "identity:basic pilot:read flights:read",
    // 只有在瀏覽器因跨網域限制無法直接呼叫 vAMSYS 時才需要：
    // 填入 Supabase Edge Function 的網址，例如 https://zuiyduedpvnqrzfnclqn.supabase.co/functions/v1/vamsys-proxy
    proxyUrl: ""
  }
};
