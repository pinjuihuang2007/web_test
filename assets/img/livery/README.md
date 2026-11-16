# 塗裝圖片

把塗裝圖片放在這個資料夾（建議 PNG／WebP，橫向側視、背景透明或白色，寬約 800–1200 px），
再到 `_data/fleet.json` 的對應塗裝加上 `"image"`，機隊頁就會改顯示圖片：

```json
{ "name": { "zh-TW": "標準塗裝", "en": "Standard" }, "body": "#ffffff", "tail": "#d9709f", "stripe": "#2b3f8f",
  "image": "assets/img/livery/a359-standard.png" }
```

沒有 `image` 的塗裝會顯示簡化的示意圖。
