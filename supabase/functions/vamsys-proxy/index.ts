// 備用方案：當瀏覽器因跨網域限制無法直接呼叫 vAMSYS 時，由這個函式代為
//   1) 用授權碼 + code_verifier 換權杖（公開客戶端，不使用 client secret）
//   2) 用權杖取得「該機師本人」的資料
// 權杖與資料不會被記錄或儲存，只是轉送。只接受來自本站網域的請求，且只會連到 vAMSYS。
//
// 部署：Supabase 儀表板 → Edge Functions → 新增 vamsys-proxy → 貼上這份程式 → 關閉 "Verify JWT" → Deploy
// 環境變數（Edge Functions → Secrets）：
//   VAMSYS_CLIENT_ID   例如 1364
//   ALLOWED_ORIGINS    例如 https://china-airlines-virtual.github.io （多個用逗號分隔）

const TOKEN_URL = "https://vamsys.io/oauth/token";
const API_BASE = "https://vamsys.io/api/v3/pilot";
const CLIENT_ID = Deno.env.get("VAMSYS_CLIENT_ID") ?? "";
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://china-airlines-virtual.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

const isStr = (v: unknown, max = 4096): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST" || !origin || !ALLOWED.includes(origin)) return reply(403, { error: "forbidden" });
  if (!CLIENT_ID) return reply(500, { error: "not_configured" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "bad_request" }); }

  if (body.action === "token") {
    if (!isStr(body.code) || !isStr(body.code_verifier, 256) || !isStr(body.redirect_uri, 2048)) {
      return reply(400, { error: "bad_request" });
    }
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: body.redirect_uri,
        code: body.code,
        code_verifier: body.code_verifier,
      }).toString(),
    });
    return new Response(await r.text(), { status: r.status, headers });
  }

  if (body.action === "profile") {
    if (!isStr(body.access_token, 8192)) return reply(400, { error: "bad_request" });
    const get = async (path: string) => {
      const r = await fetch(API_BASE + path, {
        headers: { "Authorization": "Bearer " + body.access_token, "Accept": "application/json" },
      });
      return { status: r.status, data: r.ok ? await r.json() : null };
    };
    const [user, profile] = await Promise.all([get("/user"), get("/profile")]);
    if (user.status === 401 || user.status === 403) return reply(401, { error: "unauthorized" });
    if (!user.data) return reply(502, { error: "upstream_error" });
    return reply(200, { user: user.data, profile: profile.data });
  }

  return reply(400, { error: "bad_request" });
});
