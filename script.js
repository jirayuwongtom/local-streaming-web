// 1. ตั้งค่าข้อมูลรายชื่อตอนและไฟล์วิดีโอ 
const episodes = [
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 1", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 1 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 2", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 2 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 3", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 3 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 4", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 4 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 5", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 5 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 6", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 6 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 7", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 7 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 8", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 8 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 9", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 9 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 10", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 10 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 11", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 11 Subthai (purinpra).mp4" },
    { title: "Girls und Panzer - Motto Love Love Sakusen desu! ตอนที่ 12", file: "Girls und Panzer - Motto Love Love Sakusen desu! - 12 Subthai (purinpra).mp4" }
];

const playlistElement = document.getElementById('playlist');
const videoPlayer = document.getElementById('videoPlayer');
const videoSource = document.getElementById('videoSource');

// 2. ฟังก์ชันสร้างรายการคลิก
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
    if(episodes.length > 0) {
        playEpisode(0);
    }
}

// 3. ฟังก์ชันเล่นวิดีโอและเปลี่ยนแถบสี
function playEpisode(index) {
    // เปลี่ยน source ของไฟล์วิดีโอ
    videoSource.src = episodes[index].file;
    videoPlayer.load(); // โหลดวิดีโอใหม่รอไว้เฉยๆ
    videoPlayer.pause(); // เพิ่มคำสั่งหยุด (Pause) เข้าไปแทนเพื่อความชัวร์

    // เอาคลาส 'active' (สีส้ม) ออกจากทุกตอนก่อน
    const allItems = playlistElement.getElementsByClassName('episode-item');
    for(let i = 0; i < allItems.length; i++) {
        allItems[i].classList.remove('active');
    }
    
    // ใส่คลาส 'active' ให้ตอนที่กำลังเล่นอยู่
    allItems[index].classList.add('active');
}

// เรียกใช้งานฟังก์ชันสร้าง Playlist
loadPlaylist();