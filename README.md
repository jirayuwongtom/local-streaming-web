# Local Streaming Web

เว็บเล่นวิดีโอในเครื่อง/วง LAN รองรับไฟล์ `.mp4` และ `.mkv` พร้อมซับ `.ass` ที่แสดงสี ตำแหน่ง และสไตล์ตรงกับ VLC
(ใช้ [JASSUB](https://github.com/ThaUnknown/jassub) ซึ่งเป็น libass ตัวเดียวกับที่ VLC ใช้)

## โครงสร้างโฟลเดอร์

```
local-streaming-web/
├── index.html
├── script.js            <- แก้รายชื่อตอนที่นี่
├── style.css
├── fonts/
│   └── Sarabun-Regular.ttf      (ฟอนต์ไทยสำรองสำหรับซับ)
├── lib/jassub/                  (ตัวเรนเดอร์ซับ)
│   ├── jassub.umd.js
│   ├── jassub-worker.js
│   ├── jassub-worker.wasm
│   ├── jassub-worker-modern.wasm
│   └── default.woff2
├── ตอนที่ 1.mkv
├── ตอนที่ 1.ass                 (ซับชื่อเดียวกับวิดีโอ)
└── ...
```

ไฟล์วิดีโอและซับวางไว้โฟลเดอร์เดียวกับ `index.html` หรือวางในโฟลเดอร์ย่อยก็ได้ (เช่น `videos/ep1.mkv`)

## ติดตั้งครั้งแรก (PowerShell)

รันในโฟลเดอร์โปรเจกต์ ทีละบรรทัด (ต้องมี Node.js)

```powershell
# 1) โหลดไลบรารีซับ JASSUB
npm pack jassub@1.8.6
tar -xzf jassub-1.8.6.tgz

# 2) คัดลอกไฟล์ที่ต้องใช้
New-Item -ItemType Directory -Force lib\jassub, fonts | Out-Null
$files = "jassub.umd.js","jassub-worker.js","jassub-worker.wasm","jassub-worker-modern.wasm","default.woff2"
foreach ($f in $files) { Copy-Item "package\dist\$f" "lib\jassub\" }

# 3) ลบไฟล์ชั่วคราว
Remove-Item package -Recurse -Force
Remove-Item jassub-1.8.6.tgz

# 4) โหลดฟอนต์ไทย Sarabun
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf" -OutFile "fonts\Sarabun-Regular.ttf"
```

ติดตั้ง ffmpeg (ใช้ดึงซับออกจากไฟล์ mkv):

```powershell
winget install Gyan.FFmpeg --source winget
```

แล้วปิด-เปิด PowerShell ใหม่ ตรวจด้วย `ffmpeg -version`

## เปิดใช้งาน

ต้องเปิดผ่านเซิร์ฟเวอร์ (`http://`) ดับเบิลคลิกเปิด `index.html` ตรงๆ ไม่ได้ เพราะ Web Worker ไม่ทำงานบน `file://`

```powershell
cd D:\mini_app\local-streaming-web
python -m http.server 8000
```

แล้วเปิด `http://localhost:8000` (ใช้ Live Server ของ VS Code หรือเซิร์ฟเวอร์ตัวอื่นก็ได้)
กด **Ctrl+F5** ทุกครั้งที่แก้ `script.js` เพื่อล้างแคช

> หมายเหตุ: `python -m http.server` ไม่รองรับ Range request ทำให้กรอวิดีโอ (seek) ไม่ได้
> ถ้าต้องกรอได้ ให้ใช้เซิร์ฟเวอร์ที่รองรับ เช่น `npx http-server` หรือ Live Server

## วิธีเพิ่มตอนใหม่ (กรณีมีหลายตอน)

### ขั้นที่ 1: ดึงซับออกจากไฟล์ .mkv

ตรวจก่อนว่าไฟล์มีซับกี่แทร็ก:

```powershell
ffprobe -v error -select_streams s -show_entries stream=index,codec_name:stream_tags=language,title -of csv=p=0 "ชื่อไฟล์.mkv"
```

ผลลัพธ์เช่น `3,ass,tha` แปลว่ามีซับไทยชนิด ass (ใช้ได้เลย)

ดึงซับของ **ทุกไฟล์ .mkv ในโฟลเดอร์** ในคำสั่งเดียว (ได้ไฟล์ .ass ชื่อเดียวกับ .mkv):

```powershell
Get-ChildItem *.mkv | ForEach-Object { ffmpeg -y -i $_.FullName -map 0:s:0 ($_.BaseName + ".ass") }
```

- `0:s:0` คือซับแทร็กแรก ถ้าซับไทยเป็นแทร็กที่สอง ให้เปลี่ยนเป็น `0:s:1`
- ตอนไหนไม่มีซับฝังอยู่ จะขึ้น error เฉพาะตอนนั้น ตอนอื่นไม่กระทบ

### ขั้นที่ 2: สร้างรายชื่อตอนอัตโนมัติ

คำสั่งนี้พิมพ์บรรทัดรายชื่อตอนของทุก .mkv ในโฟลเดอร์ เรียงเลขตอนถูกต้อง (1, 2, ... 10 ไม่ใช่ 1, 10, 2):

```powershell
Get-ChildItem *.mkv | Sort-Object { [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(10,'0') }) } | ForEach-Object {
    '    { title: "' + $_.BaseName + '", file: "' + $_.Name + '" },'
}
```

คัดลอกผลลัพธ์ไปวางในรายการ `episodes` ของ `script.js` แล้วแก้ `title` ให้สวยตามต้องการ

```js
const episodes = [
    { title: "ตอนที่ 1", file: "ชื่อไฟล์ตอน 1.mkv" },
    { title: "ตอนที่ 2", file: "ชื่อไฟล์ตอน 2.mkv" },
    // ...
];
```

### กติกาเรื่องซับ

| กรณี | วิธีใส่ |
| --- | --- |
| ไฟล์ .ass ชื่อเดียวกับวิดีโอ (ต่างแค่นามสกุล) | ใส่แค่ `file` ระบบหาซับให้เอง (ลอง `.ass` แล้ว `.ssa`) |
| ไฟล์ซับชื่อไม่ตรงกับวิดีโอ | ระบุเอง: `{ title: "...", file: "a.mkv", sub: "ซับ-a.ass" }` |
| วิดีโอไม่มีซับ | ใส่แค่ `file` (ถ้าหาไฟล์ซับไม่เจอ ก็เล่นโดยไม่มีซับ) |

ชื่อไฟล์ต้องตรงทุกตัวอักษร รวมช่องว่างและตัวพิมพ์เล็ก/ใหญ่ ชื่อที่มีช่องว่างหรือวงเล็บใช้ได้ปกติ

## ปุ่มลัด

- **F** หรือดับเบิลคลิกที่วิดีโอ หรือกดปุ่ม ⛶ = เต็มจอ
  (ใช้ปุ่มเต็มจอของเราแทนปุ่มของ player เพราะปุ่มเดิมจะทำให้ซับหายตอนเต็มจอ)

## ฟอนต์ของซับ

ถ้าซับขึ้นแล้วแต่หน้าตาไม่เหมือน VLC สาเหตุมักเป็นฟอนต์ที่ซับระบุไว้ไม่มีให้ตัวเรนเดอร์ใช้

1. **ฟอนต์ที่ฝังในไฟล์ mkv** ดึงออกมาใส่โฟลเดอร์ย่อย:
   ```powershell
   mkdir fonts-extract
   cd fonts-extract
   ffmpeg -dump_attachment:t '""' -i "..\ชื่อไฟล์.mkv"
   cd ..
   ```
   (ข้อความ error ท้ายคำสั่งไม่ต้องสนใจ) แล้วย้ายไฟล์ .ttf/.otf ไปไว้ใน `fonts/`
2. เพิ่มชื่อฟอนต์และไฟล์ใน `SUB_FONTS` ของ `script.js` โดย key คือชื่อฟอนต์ **ตัวพิมพ์เล็ก** ตรงกับชื่อที่ซับเรียกใช้
   ```js
   const SUB_FONTS = {
       'sarabun': 'fonts/Sarabun-Regular.ttf',
       'ชื่อฟอนต์ตัวพิมพ์เล็ก': 'fonts/ชื่อไฟล์.ttf'
   };
   ```
3. Chrome/Edge ที่เปิดผ่าน `localhost` หรือ `https` จะขออนุญาตอ่านฟอนต์ในเครื่อง ถ้ากดอนุญาต จะใช้ฟอนต์ที่ติดตั้งในเครื่องให้อัตโนมัติ

## แก้ปัญหาเบื้องต้น

| อาการ | สาเหตุ / วิธีแก้ |
| --- | --- |
| ซับไม่ขึ้นเลย | ตรวจว่ามีไฟล์ .ass ชื่อเดียวกับวิดีโอ และเปิดผ่าน `http://` ไม่ใช่ `file://` กด F12 ดูแท็บ Console |
| ขึ้นข้อความ "เล่นไฟล์นี้ไม่ได้" | ไม่พบไฟล์ หรือ codec ที่เบราว์เซอร์ไม่รองรับ (ดูด้านล่าง) |
| เห็นภาพแต่ไม่มีเสียง | เสียงอาจเป็น FLAC/AC3/DTS ที่เบราว์เซอร์บางตัวไม่รองรับ (ดูด้านล่าง) |
| กรอวิดีโอไม่ได้ | เซิร์ฟเวอร์ไม่รองรับ Range request (ดูหมายเหตุในหัวข้อเปิดใช้งาน) |
| ซับเพี้ยนเฉพาะฟอนต์ | ดูหัวข้อ "ฟอนต์ของซับ" |
| แก้โค้ดแล้วไม่เปลี่ยน | กด Ctrl+F5 |

### เรื่อง codec ของ .mkv

เบราว์เซอร์เล่น .mkv ได้เมื่อรองรับ codec ข้างใน

- **เล่นได้**: วิดีโอ H.264 (8-bit) + เสียง AAC/MP3/Opus บน Chrome/Edge
- **มักเล่นไม่ได้**: วิดีโอ HEVC/H.265 หรือ 10-bit, เสียง AC3/DTS (FLAC เล่นได้ในบางเบราว์เซอร์)
- Firefox และ Safari แทบไม่รองรับ .mkv ให้ใช้ Chrome หรือ Edge

ตรวจ codec ของไฟล์:

```powershell
ffprobe -v error -show_entries stream=index,codec_type,codec_name,profile,pix_fmt -of csv=p=0 "ชื่อไฟล์.mkv"
```

ถ้าวิดีโอเป็น H.264 แต่เสียงเล่นไม่ได้ แปลงเฉพาะเสียงเป็น AAC (ไม่เข้ารหัสวิดีโอใหม่ เร็วและภาพไม่เสียคุณภาพ):

```powershell
ffmpeg -i "in.mkv" -c:v copy -c:a aac -b:a 192k "out.mkv"
```

ถ้าวิดีโอเป็น HEVC หรือ 10-bit ต้องเข้ารหัสวิดีโอใหม่ (ช้า และกิน CPU):

```powershell
ffmpeg -i "in.mkv" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k "out.mp4"
```

(แปลงเป็น .mp4 แล้วซับที่ดึงไว้เป็น .ass ใช้ต่อได้ แค่ตั้งชื่อ .ass ให้ตรงกับชื่อ .mp4 ใหม่)

## เครดิต

- [JASSUB](https://github.com/ThaUnknown/jassub) (ตัวเรนเดอร์ซับ ใช้ libass)
- ฟอนต์ [Sarabun](https://github.com/cadsondemak/Sarabun) (SIL Open Font License)
