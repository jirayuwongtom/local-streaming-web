// 1. ตั้งค่าข้อมูลรายชื่อตอนและไฟล์วิดีโอ
// ใส่เป็น .mp4 หรือ .mkv ก็ได้ ระบบจะหาทั้ง .mp4 และ .mkv และดึงซับในไฟล์ .mkv ออกมาแสดงเองเหมือน VLC
const episodes = [
    { title: "Serial Experiments Lain ตอนที่ 1", file: "Serial Experiments Lain - 1 (Mini-BD + Subtitle ass 1518x1078 FLAC 2.0).mkv" },
    // ตอนอื่นทำแบบเดียวกัน
];

// 1. ตั้งค่าข้อมูลรายชื่อตอนและไฟล์วิดีโอ
//    file : ไฟล์วิดีโอ จะเป็น .mp4 หรือ .mkv ก็ได้
//    sub  : (ไม่บังคับ) ไฟล์ซับ .ass / .ssa ที่แยกจากวิดีโอ
//           ถ้าไม่ใส่ ระบบจะลองหาไฟล์ชื่อเดียวกับวิดีโอแต่นามสกุล .ass (หรือ .ssa) ให้เอง
//           เช่น "EP01.mkv" -> ลองหา "EP01.ass"
//
//    ตัวอย่างไฟล์ .mkv + ซับแยก:
//    { title: "ตอนที่ 1", file: "EP01.mkv", sub: "EP01.ass" },


// ---- ตั้งค่าฟอนต์สำหรับซับ ----
// ฟอนต์ที่ซับ .ass ระบุไว้ (เช่น Tahoma, Angsana New, TH Sarabun New) ต้องมีให้ตัวเรนเดอร์ใช้ ไม่งั้นรูปลักษณ์จะไม่ตรงกับ VLC
//  1) Chrome/Edge จะขออนุญาตอ่านฟอนต์ในเครื่อง (ต้องเปิดผ่าน localhost หรือ https) -> ใช้ฟอนต์จริงในเครื่องให้อัตโนมัติ
//  2) ถ้าอยากให้ตรงทุกเครื่อง ให้ copy ไฟล์ฟอนต์ (.ttf/.otf) ไปไว้ในโฟลเดอร์ fonts/ แล้วเพิ่มชื่อ-ไฟล์ตรงนี้
//     key = ชื่อฟอนต์ (family) ตัวพิมพ์เล็ก ตรงกับที่ซับเรียกใช้
const SUB_FONTS = {
    'sarabun': 'fonts/Sarabun-Regular.ttf'
};
const SUB_FALLBACK_FONT = 'sarabun'; // ใช้เมื่อหาฟอนต์ของซับไม่เจอ หรือฟอนต์นั้นไม่มีตัวอักษรไทย

const playlistElement = document.getElementById('playlist');
const videoPlayer = document.getElementById('videoPlayer');
const playerContainer = document.getElementById('playerContainer');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const statusBox = document.getElementById('status');

let subRenderer = null; // ตัวเรนเดอร์ซับ (JASSUB) ของตอนที่เล่นอยู่
let loadToken = 0;      // กันกรณีกดเปลี่ยนตอนรัวๆ แล้วผลโหลดซับของตอนเก่ามาทับตอนใหม่

// 2. ฟังก์ชันช่วยเล็กๆ
// เข้ารหัส path ทีละส่วน เพื่อให้ชื่อไฟล์ที่มีช่องว่าง วงเล็บ # ? เล่นได้ปกติ
function toUrl(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}

function showStatus(message) {
    statusBox.textContent = message || '';
    statusBox.hidden = !message;
}

// 3. โหลดไฟล์ซับเป็นข้อความ (รองรับ UTF-8 และซับไทยเก่าแบบ Windows-874/TIS-620)
async function fetchSubtitleText(path) {
    try {
        const res = await fetch(toUrl(path));
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        let text;
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
        } catch (e) {
            text = new TextDecoder('windows-874').decode(buf);
        }
        text = text.replace(/^\uFEFF/, ''); // ตัด BOM
        // กันกรณีเซิร์ฟเวอร์ตอบหน้า HTML (404 แบบ 200) กลับมาแทนไฟล์ซับ
        return /\[(Script Info|V4\+? Styles|Events)\]/i.test(text) ? text : null;
    } catch (e) {
        return null;
    }
}

async function findSubtitle(ep) {
    if (ep.sub) {
        const text = await fetchSubtitleText(ep.sub);
        if (!text) console.warn('อ่านไฟล์ซับไม่ได้:', ep.sub);
        return text;
    }
    const base = ep.file.replace(/\.[^./]+$/, '');
    for (const ext of ['.ass', '.ssa']) {
        const text = await fetchSubtitleText(base + ext);
        if (text) return text;
    }
    return null;
}

function destroySubtitles() {
    if (subRenderer) {
        subRenderer.destroy();
        subRenderer = null;
    }
}

// Worker อ่าน path แบบ relative โดยอิงจากตำแหน่งไฟล์ worker เอง จึงต้องแปลงเป็น URL เต็มก่อนส่งให้ JASSUB
function absUrl(path) {
    return new URL(path, document.baseURI).href;
}

function attachSubtitles(text) {
    const fonts = {};
    for (const [family, path] of Object.entries(SUB_FONTS)) {
        fonts[family.toLowerCase()] = absUrl(path);
    }
    subRenderer = new JASSUB({
        video: videoPlayer,
        subContent: text,
        workerUrl: absUrl('lib/jassub/jassub-worker.js'),
        wasmUrl: absUrl('lib/jassub/jassub-worker.wasm'),
        modernWasmUrl: absUrl('lib/jassub/jassub-worker-modern.wasm'),
        availableFonts: fonts,
        fallbackFont: SUB_FALLBACK_FONT.toLowerCase(),
        useLocalFonts: true
    });
}

// 4. ฟังก์ชันสร้างรายการคลิก
function loadPlaylist() {
    episodes.forEach((ep, index) => {
        const li = document.createElement('li');
        li.className = 'episode-item';
        li.textContent = ep.title;

        // เมื่อคลิกที่ชื่อตอน
        li.onclick = () => playEpisode(index);
        playlistElement.appendChild(li);
    });

    // ให้เริ่มโหลดตอนที่ 1 (index 0) ทันทีที่เปิดหน้าเว็บ
    if (episodes.length > 0) {
        playEpisode(0);
    }
}

// 5. ฟังก์ชันเล่นวิดีโอ + โหลดซับ และเปลี่ยนแถบสี
async function playEpisode(index) {
    const ep = episodes[index];
    const token = ++loadToken;

    // เอาคลาส 'active' (สีส้ม) ออกจากทุกตอนก่อน แล้วใส่ให้ตอนที่เลือก
    const allItems = playlistElement.getElementsByClassName('episode-item');
    for (let i = 0; i < allItems.length; i++) {
        allItems[i].classList.remove('active');
    }
    allItems[index].classList.add('active');

    showStatus('');
    destroySubtitles();

    // ตั้ง src ตรงๆ โดยไม่ระบุ type เพื่อให้เบราว์เซอร์ตรวจเองว่าเป็น mp4 หรือ mkv
    videoPlayer.pause();
    videoPlayer.src = toUrl(ep.file);
    videoPlayer.load(); // โหลดวิดีโอใหม่รอไว้เฉยๆ

    const text = await findSubtitle(ep);
    if (token !== loadToken) return; // ระหว่างรอ มีการกดเปลี่ยนตอนไปแล้ว
    if (text) attachSubtitles(text);
}

// 6. แจ้งเตือนเมื่อเบราว์เซอร์เล่นไฟล์ไม่ได้ (พบบ่อยกับ .mkv)
videoPlayer.addEventListener('error', () => {
    if (!videoPlayer.getAttribute('src')) return;
    const err = videoPlayer.error;
    if (err && err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        showStatus('เล่นไฟล์นี้ไม่ได้: ไม่พบไฟล์ หรือเบราว์เซอร์ไม่รองรับ codec ในไฟล์ (เช่น HEVC/H.265, 10-bit, AC3/DTS) ' +
            'ลองใช้ Chrome/Edge หรือแปลงไฟล์ด้วย ffmpeg: ffmpeg -i input.mkv -c:v libx264 -c:a aac output.mp4');
    } else {
        showStatus('เล่นวิดีโอไม่สำเร็จ (รหัสข้อผิดพลาด ' + (err ? err.code : '?') + ')');
    }
});

// 7. โหมดเต็มจอ: ขยายทั้ง container (วิดีโอ + ชั้นซับ) ไม่ใช่เฉพาะ <video>
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        playerContainer.requestFullscreen();
    }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);
videoPlayer.addEventListener('dblclick', toggleFullscreen);
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFullscreen();
});
document.addEventListener('fullscreenchange', () => {
    if (subRenderer) setTimeout(() => subRenderer.resize(), 100); // ปรับขนาดชั้นซับตามจอใหม่
});

// เรียกใช้งานฟังก์ชันสร้าง Playlist
loadPlaylist();