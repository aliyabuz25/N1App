window.addEventListener('load', async () => {
  const loader = document.getElementById("loader");
  const appBody = document.getElementById("app-body");
  const loginView = document.getElementById("loginView");
  const tokenList = document.getElementById("tokenList");
  const user = localStorage.getItem("user_email");

  // Fetch and display launcher paths
  if (window.electronAPI && window.electronAPI.getLauncherPaths) {
    const paths = await window.electronAPI.getLauncherPaths();
    const riotText = document.getElementById("riotPathText");
    const steamText = document.getElementById("steamPathText");
    const eaText = document.getElementById("eaPathText");

    if (riotText) {
      const val = (paths.riot && paths.riot !== 'Not found') ? paths.riot : 'OFFLINE';
      riotText.innerText = val;
      riotText.style.color = (val !== 'OFFLINE') ? '#94a3b8' : '#ef4444';
      riotText.title = val;
    }
    if (steamText) {
      const val = (paths.steam && paths.steam !== 'Not found') ? paths.steam : 'OFFLINE';
      steamText.innerText = val;
      steamText.style.color = (val !== 'OFFLINE') ? '#94a3b8' : '#ef4444';
      steamText.title = val;
    }
    if (eaText) {
      const val = (paths.ea && paths.ea !== 'Not found') ? paths.ea : 'OFFLINE';
      eaText.innerText = val;
      eaText.style.color = (val !== 'OFFLINE') ? '#94a3b8' : '#ef4444';
      eaText.title = val;
    }
  }

  // Smooth initialization sequence
  setTimeout(() => {
    // 1. Initial State Handling
    if (user) {
      if (loginView) loginView.style.display = "none";
      if (tokenList) {
        tokenList.style.display = "block";
        tokenList.classList.add("view-transition");
      }
    } else {
      if (loginView) {
        loginView.style.display = "block";
        loginView.classList.add("view-transition");
      }
      if (tokenList) tokenList.style.display = "none";
    }

    // 2. Clear Loader
    if (loader) {
      loader.classList.add("fade-out");
      setTimeout(() => loader.remove(), 800);
    }

    // 3. Reveal App Body
    if (appBody) {
      appBody.style.opacity = "1";
      appBody.style.transform = "translateY(0)";
    }
  }, 400);

  // Privacy Protocol Logic
  const privacyAccepted = localStorage.getItem("privacy_accepted");
  if (!privacyAccepted) {
    setTimeout(() => {
      const privacyBanner = document.getElementById("privacyBanner");
      if (privacyBanner) privacyBanner.classList.remove("hidden");
    }, 2500);
  }

  // Initialize Lucide Icons
  if (window.lucide) window.lucide.createIcons();

  // Persist language on load
  const savedLang = localStorage.getItem("app_lang") || "en";
  if (savedLang !== "en") setLanguage(savedLang);
});

function closePrivacy() {
  const privacyBanner = document.getElementById("privacyBanner");
  if (privacyBanner) {
    privacyBanner.style.opacity = "0";
    privacyBanner.style.transform = "translate(-50%, 10px)";
    setTimeout(() => privacyBanner.remove(), 400);
  }
}

function acceptPrivacy() {
  localStorage.setItem("privacy_accepted", "true");
  closePrivacy();
}

// Global Translation Logic
const translations = {
  tr: { "#currentLangLabel": "TR", "#currentFlag": "https://flagcdn.com/w20/tr.png" },
  en: { "#currentLangLabel": "EN", "#currentFlag": "https://flagcdn.com/w20/gb.png" },
  de: { "#currentLangLabel": "DE", "#currentFlag": "https://flagcdn.com/w20/de.png" }
};

function toggleLangMenu() {
  const menu = document.getElementById("langMenu");
  if (menu) menu.classList.toggle("hidden");
}

function setLanguage(lang) {
  localStorage.setItem("app_lang", lang);
  const data = translations[lang];
  if (document.getElementById("currentLangLabel")) document.getElementById("currentLangLabel").innerText = data["#currentLangLabel"];
  if (document.getElementById("currentFlag")) document.getElementById("currentFlag").src = data["#currentFlag"];

  document.querySelectorAll("[data-tr], [data-de]").forEach(el => {
    const originalText = el.getAttribute("data-en") || el.innerText;
    if (!el.hasAttribute("data-en")) el.setAttribute("data-en", originalText);
    if (lang === "tr") el.innerText = el.getAttribute("data-tr") || el.getAttribute("data-en");
    else if (lang === "de") el.innerText = el.getAttribute("data-de") || el.getAttribute("data-en");
    else el.innerText = el.getAttribute("data-en");
  });
  if (window.lucide) window.lucide.createIcons();
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && overlay) {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}

const originalLogout = window.logout;
window.logout = function () {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
  if (typeof originalLogout === 'function') originalLogout();
};

// Anticheat Console Modal Logic
function showConsole() {
  const modal = document.getElementById("consoleModal");
  const overlay = document.getElementById("consoleOverlay");
  const logs = document.getElementById("consoleLogs");
  if (modal && overlay) {
    if (logs) logs.innerHTML = ""; // Clear old logs
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");
  }
}

function closeConsole() {
  const modal = document.getElementById("consoleModal");
  const overlay = document.getElementById("consoleOverlay");
  if (modal && overlay) {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
  }
}

// LCU Log Listeners (Moved to Native Windows Notifications in main.js)
if (window.electronAPI) {
  // Console Log Listener for Modal
  if (window.electronAPI.onConsoleLog) {
    window.electronAPI.onConsoleLog((msg) => {
      if (msg.includes("[STEP]")) showConsole(); // Auto-show on active steps
      const logs = document.getElementById("consoleLogs");
      if (logs) {
        const line = document.createElement("div");
        line.className = "log-line";

        let processed = msg.replace(/^\[STEP\]/, '<span class="tag-info">[STEP]</span>')
          .replace(/^\[SUCCESS\]/, '<span class="tag-success">[SUCCESS]</span>')
          .replace(/^\[FATAL\]/, '<span class="tag-err">[FATAL]</span>')
          .replace(/^\[DEBUG\]/, '<span class="tag-debug">[DEBUG]</span>')
          .replace(/^\[ERR\]/, '<span class="tag-err">[ERR]</span>')
          .replace(/^\[LCU REQ\]/, '<span class="tag-debug">[LCU REQ]</span>');

        line.innerHTML = `> ${processed}`;
        logs.appendChild(line);
        logs.scrollTop = logs.scrollHeight;

        if (msg.includes("[DONE]")) {
          setTimeout(closeConsole, 2500);
        } else if (msg.includes("[FATAL]")) {
          setTimeout(closeConsole, 5000);
        }
      }
    });
  }

  // Update Console Time
  setInterval(() => {
    const timeEl = document.getElementById("consoleTime");
    if (timeEl) timeEl.innerText = new Date().toLocaleTimeString();
  }, 1000);

  window.electronAPI.onLaunchError((msg) => {
    if (typeof Toastify !== 'undefined' && msg) {
      Toastify({
        text: `🛑 GİRİŞ HATASI: ${msg}`,
        duration: 8000,
        gravity: "bottom",
        position: "right",
        close: true,
        style: {
          background: "rgba(153, 27, 27, 0.95)",
          color: "#fee2e2",
          borderLeft: "6px solid #f87171",
          fontWeight: "bold",
          fontSize: "14px"
        }
      }).showToast();
    }
  });
}

window.onerror = function (msg, url, line) {
  console.error("UI System Error: " + msg + " line: " + line);
};

async function selectLauncher(type) {
  if (window.electronAPI && window.electronAPI.selectLauncher) {
    const newPath = await window.electronAPI.selectLauncher(type);
    if (newPath) {
      const textId = (type === 'riot') ? "riotPathText" : (type === 'steam' ? "steamPathText" : "eaPathText");
      const el = document.getElementById(textId);
      if (el) {
        el.innerText = newPath;
        el.style.color = '#10b981';
      }
      if (typeof Toastify !== 'undefined') {
        Toastify({
          text: `${type.toUpperCase()} path updated successfully`,
          duration: 3000,
          gravity: "bottom",
          position: "right",
          style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
        }).showToast();
      }
    }
  }
}