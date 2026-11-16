// 每次建置都會換一個版本代碼，加在 CSS／JS 網址後面（?v=…），讓更新後瀏覽器馬上抓新檔，不會卡在舊快取。
module.exports = { version: Date.now().toString(36) };
