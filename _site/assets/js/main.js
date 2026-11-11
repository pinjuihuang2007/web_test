/**
 * 中華虛擬航空 China Airlines Virtual - Main JavaScript
 */

// ==========================================
// 1. 多國語言 (i18n) 字典定義
// ==========================================
const i18n = {
  zh: {
    crew_login: "組員登入",
    hero_title: "中華虛擬航空",
    hero_subtitle: "點亮台灣的天空",
    join_us: "加入我們",
    about_title: "飛行，不該有門檻。",
    about_desc: "中華虛擬航空是一個讓熱愛飛行的人聚在一起的地方。從第一次起飛的緊張，到熟練巡航的從容，我們陪你走過每一段航程。<br>這裡沒有壓力，只有分享與成長；<br>沒有距離，只有共同仰望的天空。",
    feature_1_title: "連飛活動",
    feature_1_desc: "與其他虛擬航空公司舉辦飛行活動",
    feature_2_title: "線上教學",
    feature_2_desc: "至今已經舉辦數十場線上課程，讓菜鳥成為能夠自在與航管溝通的機師",
    feature_3_title: "台灣最活躍社群",
    feature_3_desc: "每天都有許多成員在 Discord 上愉快的交流",
    welcome_back: "歡迎回家，機長。",
    announcements_title: "活動公告",
    no_announcements: "目前沒有活動公告，敬請期待。",
    live_title: "台灣航機即時動態",
    live_desc: "串接 VATSIM 即時資料，顯示起降台灣機場的航班。",
    th_status: "動態",
    th_callsign: "呼號",
    th_aircraft: "機型",
    th_dep: "出發",
    th_arr: "目的地",
    loading_vatsim: "正在取得 VATSIM 即時資料…",
    no_flights: "目前無台灣起降之線上航班",
    vatsim_error: "無法取得 VATSIM 即時資料，請稍後再試。",
    dispatch_title: "簽派系統",
    dispatch_subtitle: "我們擁有強大的簽派系統，讓您紀錄每次的飛行",
    dispatch_f1_t: "真實航空的航線與飛機",
    dispatch_f1_d: "模擬真實航空公司的航線與執飛體驗",
    dispatch_f2_t: "追蹤每趟飛行",
    dispatch_f2_d: "紀錄你的每班飛行，回憶去過的每個機場",
    dispatch_f3_t: "統計飛行資料",
    dispatch_f3_d: "與朋友一起比賽看誰飛的又多又遠又省油",
    dispatch_f4_t: "有趣的活動與任務",
    dispatch_f4_d: "不定期舉辦主題飛行、挑戰任務與限時活動，讓每一次飛行都多一點驚喜與成就感。",
    stats_title: "統計數據",
    stats_pilots: "活躍機師",
    stats_flights: "班次",
    stats_hours: "飛行時數",
    member_title: "會員數位識別證",
    member_desc: "使用 vAMSYS 帳號登入，查看你的專屬識別證與飛行資料。資料只會顯示在你自己的瀏覽器，不會儲存到本站。",
    hiring_title: "人才招募",
    hiring_desc: "無論是菜鳥、資深機師、專業航管，我們都非常歡迎您的加入",
    join_dc_title: "加入 Discord →",
    join_dc_desc: "每天都有成員們在線上飛行、學習、討論",
    join_fb_title: "加入 Facebook 社團 →",
    join_fb_desc: "社團內有設百位成員與你一起分享飛行時的快樂",
    faq_title: "常見問題",
    faq_q1: "什麼是虛擬航空？",
    faq_a1: "虛擬航空是一個模擬真實航空公司的團體，透過連飛平台，成員們可以在虛擬天空中飛行，並且可以與其他飛行員與航管進行溝通。",
    faq_q2: "會不會被開除？",
    faq_a2: "原則上不會，除非違反本虛擬航空規定。",
    faq_q3: "加入後具體來說要做什麼？",
    faq_a3: "在虛擬天空中翱翔，並遵守當地飛行規定",
    faq_q4: "有薪水嗎？",
    faq_a4: "當然不會有薪水拉😂，但會不定時發送禮物，年末會舉辦抽獎活動慰勞各位",
    faq_q5: "我飛不好會不會被罵？",
    faq_a5: "不會，但可能會被笑，我們是一個友善的社群，歡迎任何人加入，不論您是新手或老手，我們都會以最大的熱情歡迎您的加入。",
    partners_title: "合作夥伴",
    p_vatsim: "自 2023 年起，正式成為 VATSIM 合作夥伴",
    p_ivao: "自 2022 年起，正式成為 IVAO 合作夥伴",
    p_hangzhou: "自 2023 年起，正式成為杭州航空合作夥伴",
    p_jal: "自 2024 年起，正式成為日本航空合作夥伴",
    p_simbrief: "自 2024 年起，正式成為 Simbrief 合作夥伴",
    disclaimer: "※免責聲明※ 本網頁提供的所有資料、商標、標誌、圖像連結及其他資料等只供學術探討研究，並無任何營利商業用途，與真實航空公司無任何關係。",
    privacy_title: "隱私權政策",
    privacy_sub: "資料蒐集",
    privacy_p1: "我們將基於虛擬航空公司對飛行員的角度蒐集以下資料:",
    privacy_l1: "您的暱稱, 您的英文名縮寫, IVAO VID, VATSIM CID",
    privacy_l2: "您飛行的相關紀錄，僅限於當時飛行的呼號及飛行數據",
    privacy_p2: "我們將保留這些資料並顯示於我們網站上並作為活動宣傳使用。",
    privacy_p3: "若您對隱私權政策有任何疑問或要求刪除資料，請隨時透過信箱與我們聯繫。",
    toggle_btn: "English"
  },
  en: {
    crew_login: "Crew Login",
    hero_title: "China Airlines Virtual",
    hero_subtitle: "Illuminating Taiwan's Skies",
    join_us: "Join Us",
    about_title: "Flying without Boundaries.",
    about_desc: "China Airlines Virtual is a community for aviation enthusiasts. From your first anxious takeoff to confident cruising, we fly with you every step of the way.<br>No pressure here, just sharing and growth;<br>no distance, just the same sky we look up to.",
    feature_1_title: "Group Flights",
    feature_1_desc: "Joint group flights organized with other virtual airlines.",
    feature_2_title: "Online Training",
    feature_2_desc: "Dozens of training sessions held to guide rookies into confident ATC communication.",
    feature_3_title: "Active Community",
    feature_3_desc: "Active members engaging on Discord every single day.",
    welcome_back: "Welcome home, Captain.",
    announcements_title: "Announcements",
    no_announcements: "No announcements right now. Stay tuned!",
    live_title: "Taiwan Live Radar",
    live_desc: "Real-time VATSIM flight tracker filtering arrivals and departures in Taiwan.",
    th_status: "Status",
    th_callsign: "Callsign",
    th_aircraft: "Aircraft",
    th_dep: "Dep",
    th_arr: "Arr",
    loading_vatsim: "Fetching VATSIM data...",
    no_flights: "No live flights around Taiwan currently.",
    vatsim_error: "Unable to retrieve VATSIM data. Please try again later.",
    dispatch_title: "Dispatch System",
    dispatch_subtitle: "Powerful dispatch system to track and log every single flight.",
    dispatch_f1_t: "Real Airline Routes & Fleet",
    dispatch_f1_d: "Simulating realistic routes and real aircraft operations.",
    dispatch_f2_t: "Track Every Journey",
    dispatch_f2_d: "Log every sector and relive the airports you've visited.",
    dispatch_f3_t: "Flight Analytics",
    dispatch_f3_d: "Compete with friends on hours, distance, and fuel efficiency.",
    dispatch_f4_t: "Events & Challenges",
    dispatch_f4_d: "Periodic themed flights and event tasks to bring fun to every flight.",
    stats_title: "Statistics",
    stats_pilots: "Active Pilots",
    stats_flights: "Total Flights",
    stats_hours: "Flight Hours",
    member_title: "Digital Member ID",
    member_desc: "Log in with vAMSYS to view your flight stats and member card. Data is kept locally in your browser.",
    hiring_title: "Recruitment",
    hiring_desc: "Whether you are a beginner, a veteran pilot, or a controller, we welcome you!",
    join_dc_title: "Join Discord →",
    join_dc_desc: "Fly, learn, and discuss with fellow members daily.",
    join_fb_title: "Join Facebook Group →",
    join_fb_desc: "Hundreds of community members sharing the joy of flight simulation.",
    faq_title: "FAQ",
    faq_q1: "What is a Virtual Airline?",
    faq_a1: "A Virtual Airline simulates real-world airline operations on online flight networks like VATSIM and IVAO.",
    faq_q2: "Will I get fired for inactivity?",
    faq_a2: "No, as long as you follow our community guidelines.",
    faq_q3: "What do I do after joining?",
    faq_a3: "Enjoy flying in virtual skies while following local flight rules.",
    faq_q4: "Is there a salary?",
    faq_a4: "No salary! But we host giveaways and annual raffles for members.",
    faq_q5: "Will I get criticized if I fly poorly?",
    faq_a5: "Not at all! We are a friendly community and welcome pilots of all skill levels.",
    partners_title: "Partners",
    p_vatsim: "Official VATSIM Partner since 2023",
    p_ivao: "Official IVAO Partner since 2022",
    p_hangzhou: "Partnered with Hangzhou Airlines since 2023",
    p_jal: "Partnered with JAL Virtual since 2024",
    p_simbrief: "Official SimBrief Partner since 2024",
    disclaimer: "Disclaimer: All trademarks, logos, and materials on this site are for flight simulation and educational research only. Not affiliated with the real China Airlines.",
    privacy_title: "Privacy Policy",
    privacy_sub: "Data Collection",
    privacy_p1: "We collect basic virtual airline data including:",
    privacy_l1: "Nickname, callsign initials, IVAO VID, VATSIM CID",
    privacy_l2: "Flight records and simulation statistics",
    privacy_p2: "This data is displayed on our website for stats and community promotional use.",
    privacy_p3: "For privacy inquiries or data removal, please contact us via email.",
    toggle_btn: "中文"
  }
};

let currentLang = localStorage.getItem('lang') || 'zh';

// 語系切換函數
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      elem.innerHTML = i18n[lang][key];
    }
  });

  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = i18n[lang].toggle_btn;
  }
}

// ==========================================
// 2. 串接 VATSIM 即時航班動態 (復古翻頁版)
// ==========================================
async function fetchVatsimData() {
  const boardList = document.getElementById("vatsim-list");
  if (!boardList) return;

  try {
    const response = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
    if (!response.ok) throw new Error('VATSIM Network Response Error');

    const data = await response.json();

    // 篩選出發地或目的地為台灣 (ICAO: RC**) 的航班
    const taiwanFlights = (data.pilots || []).filter(pilot => {
      const dep = pilot.flight_plan?.departure || '';
      const arr = pilot.flight_plan?.arrival || '';
      return dep.startsWith('RC') || arr.startsWith('RC');
    });

    if (taiwanFlights.length === 0) {
      boardList.innerHTML = `<div class="board-row loading-row">${i18n[currentLang].no_flights}</div>`;
      return;
    }

    // 產生翻頁列表
    boardList.innerHTML = taiwanFlights.map(flight => {
      const type = flight.flight_plan?.flight_type || 'ENROUTE';
      const callsign = flight.callsign || 'N/A';
      const aircraft = flight.flight_plan?.aircraft_short || 'N/A';
      const dep = flight.flight_plan?.departure || 'N/A';
      const arr = flight.flight_plan?.arrival || 'N/A';

      return `
        <div class="board-row">
          <div class="flap-cell flipping">${type}</div>
          <div class="flap-cell flipping" style="color: #4fc3f7;">${callsign}</div>
          <div class="flap-cell flipping">${aircraft}</div>
          <div class="flap-cell flipping">${dep}</div>
          <div class="flap-cell flipping">${arr}</div>
        </div>
      `;
    }).join('');

    // 動畫結束後移除 flipping class
    setTimeout(() => {
      document.querySelectorAll('.flap-cell').forEach(cell => {
        cell.classList.remove('flipping');
      });
    }, 600);

  } catch (error) {
    console.error('VATSIM API Error:', error);
    boardList.innerHTML = `<div class="board-row loading-row">${i18n[currentLang].vatsim_error}</div>`;
  }
}

// ==========================================
// 3. 統計數據計數動畫
// ==========================================
function loadStatistics() {
  const mockStats = { pilots: 128, flights: 1450, hours: 3200 };
  const statElements = document.querySelectorAll('#statistics b');

  if (statElements.length >= 3) {
    animateCounter(statElements[0], mockStats.pilots);
    animateCounter(statElements[1], mockStats.flights);
    animateCounter(statElements[2], mockStats.hours);
  }
}

function animateCounter(element, target) {
  let start = 0;
  const duration = 1500;
  const stepTime = 20;
  const steps = duration / stepTime;
  const increment = target / steps;

  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start).toLocaleString();
    }
  }, stepTime);
}

// ==========================================
// 頁面加載完成初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // 初始化語言
  setLanguage(currentLang);
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setLanguage(currentLang === 'zh' ? 'en' : 'zh');
    });
  }

  // 初始化 VATSIM 與統計數據
  fetchVatsimData();
  loadStatistics();
  setInterval(fetchVatsimData, 60000); // 每分鐘刷新一次 VATSIM 資料
});
