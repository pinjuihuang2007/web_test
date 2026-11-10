把首頁背景影片放在這個資料夾，檔名必須是 hero.mp4。

建議規格：15～30 秒循環、不要聲音、1280x720（或 1920x1080）、10MB 左右。
GitHub 網頁上傳單一檔案上限 25MB，太大請先壓縮。

壓縮指令（電腦有裝 ffmpeg 時）：
  ffmpeg -i 原始影片.mp4 -an -vf "scale=-2:720,fps=30" -c:v libx264 -crf 28 -preset slow -movflags +faststart hero.mp4

沒有 ffmpeg 的話，可以用免費軟體 HandBrake：Preset 選 "Fast 720p30"，音訊全部移除，格式 MP4。

在 hero.mp4 放上去之前，首頁會自動改用原本的 YouTube 影片；放上去之後就不會再出現 YouTube 的標誌。
