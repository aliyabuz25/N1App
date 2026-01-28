// N1Boost Client Logic - Refactored for Stability

// Auto-login on startup
window.addEventListener('load', async () => {
  const email = localStorage.getItem("user_email");
  const password = localStorage.getItem("user_password");

  if (email && password) {
    console.log("[DEBUG] Session detection: Saved credentials found.");
    // Wait a bit for UI to be ready
    setTimeout(() => {
      authenticateUser(email, password);
    }, 500);
  }
});

// Helper to safely show notifications
function showNotification(message, type = "error") {
  if (typeof Toastify === 'function') {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "bottom",
      position: "left",
      style: {
        background: type === "success" ? "#10b981" : "#ef4444",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600"
      }
    }).showToast();
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (type === "error") alert(message);
  }
}

// Helper to reset login button state
function resetLoginState() {
  const spin = document.getElementById("logSpin");
  const btn = document.getElementById("loginButton");
  if (spin) spin.classList.add("hidden");
  if (btn) btn.removeAttribute("disabled");
}

// Authentication Flow
async function authenticateUser(email, password) {
  try {
    if (!window.electronAPI) {
      throw new Error("API Bridge not found");
    }

    const response = await window.electronAPI.authenticate({ email, password });
    console.log("[DEBUG] API Response:", response);

    if (response && response.success) {
      // Login Success
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_password", password);

      // Save History
      saveLoginHistory();

      // Switch View with Smooth Transition
      const loginView = document.getElementById("loginView");
      const tokenList = document.getElementById("tokenList");
      const sidePlaceholder = document.getElementById("sidebarPlaceholder");
      const sideContent = document.getElementById("sidebarAuthContent");

      if (loginView) loginView.style.display = "none";
      if (sidePlaceholder) sidePlaceholder.style.display = "none";
      if (sideContent) sideContent.style.display = "flex";

      if (tokenList) {
        tokenList.style.display = "block";
        tokenList.classList.remove("view-transition");
        void tokenList.offsetWidth; // Trigger reflow
        tokenList.classList.add("view-transition");
      }

      // Process Data - according to N1APP_API_DOCS
      const orders = Array.isArray(response.data) ? response.data : [];
      console.log("[DEBUG] Orders List:", orders);

      // Update UI Elements
      try { updateDashboard(orders); } catch (e) { console.error("Dashboard update failed", e); }
      try { renderOrders(orders); } catch (e) { console.error("Order render failed", e); }

      // Update Sidebar Username
      const sidebarName = document.getElementById("userNameDisplay");
      if (sidebarName) sidebarName.innerText = email.split('@')[0].toUpperCase();

    } else {
      showNotification(response.message || "Invalid credentials provided.");
      resetLoginState();
    }

  } catch (err) {
    console.error("Auth Exception:", err);
    showNotification("Connection failed. Please verify your network.");
    resetLoginState();
  }
}

// Login History Management
function saveLoginHistory() {
  try {
    const now = new Date().toISOString();
    let history = [];
    try {
      const stored = localStorage.getItem("login_history");
      history = stored ? JSON.parse(stored) : [];
    } catch { history = []; }

    if (!Array.isArray(history)) history = [];

    // Add current time and keep last 5
    history.unshift(now);
    history = history.slice(0, 5);

    localStorage.setItem("login_history", JSON.stringify(history));
  } catch (e) {
    console.warn("Could not save login history", e);
  }
}

// Dashboard Updates (Earnings & Last Login)
function updateDashboard(orders) {
  // 1. Calculate Balance (Status 3 = Completed)
  let balance = 0;
  let currency = "USD"; // Default

  if (Array.isArray(orders)) {
    orders.forEach(order => {
      if (order.status == 3 && order.price) {
        balance += (parseFloat(order.price) || 0);
        if (order.currency) currency = order.currency;
      }
    });
  }

  // Update both main and sidebar balance
  const balanceVal = `${balance.toFixed(2)} ${currency}`;
  const sidebarBalanceEl = document.getElementById("sidebarBalance");
  if (sidebarBalanceEl) sidebarBalanceEl.innerText = balanceVal;

  // 2. Show Last Login Time
  const sidebarLastLogin = document.getElementById("sidebarLastLogin");
  try {
    const history = JSON.parse(localStorage.getItem("login_history") || "[]");
    if (history.length > 0) {
      const lastDate = new Date(history[0]);
      const dateStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = lastDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const formatted = `${dateStr} • ${timeStr}`;
      if (sidebarLastLogin) sidebarLastLogin.innerText = formatted;
    } else {
      if (sidebarLastLogin) sidebarLastLogin.innerText = "Just now";
    }
  } catch {
    if (sidebarLastLogin) sidebarLastLogin.innerText = "-";
  }
}

// Populate Orders Dropdown
function renderOrders(orders) {
  const list = document.getElementById("ordersList");
  if (!list) return;

  list.innerHTML = ""; // Clear existing

  // Default option
  const def = document.createElement("option");
  const count = Array.isArray(orders) ? orders.length : 0;
  def.text = count > 0 ? "Select active assignment..." : "No active assignments found";
  def.disabled = true;
  def.selected = true;
  list.appendChild(def);

  if (!Array.isArray(orders) || orders.length === 0) return;

  orders.forEach(order => {
    const opt = document.createElement("option");
    opt.value = order.order_id;

    const serviceName = order.data?.service || order.type || "Boost";
    const shortId = (order.order_id || "???").substring(0, 8).toUpperCase();

    // Status visual
    let statusLabel = "";
    if (order.status == 1) statusLabel = "[ACTIVE]";
    if (order.status == 3) statusLabel = "[DONE]";
    if (order.status == 4) statusLabel = "[CANCEL]";

    opt.text = `#${shortId} | ${serviceName} ${statusLabel}`;

    // Save order data for later use (Launch Game)
    localStorage.setItem(`order_${order.order_id}_data`, JSON.stringify(order));

    list.appendChild(opt);
  });
}

// Detail View & Launch Logic
function setGame() {
  const list = document.getElementById("ordersList");
  const OrderId = list.value;
  if (!OrderId) return;

  const rawData = localStorage.getItem(`order_${OrderId}_data`);
  if (!rawData) return;

  let order;
  try { order = JSON.parse(rawData); } catch (e) { return; }

  // Update Detail UI
  const detailBox = document.getElementById("orderDetailBox");
  if (detailBox) detailBox.style.visibility = "visible";

  const launchBtn = document.getElementById("launchButton");
  if (launchBtn) launchBtn.removeAttribute("disabled");

  const platformLabel = document.getElementById("platformName");
  const statusBadge = document.getElementById("oType");
  const iconBox = document.getElementById("gameIconPlaceholder");

  if (platformLabel) platformLabel.innerText = order.data?.service || "Custom Order";

  // Status mapping
  const statusMap = { 1: "READY", 3: "COMPLETED", 4: "CANCELLED" };
  const stText = statusMap[order.status] || "UNKNOWN";

  if (statusBadge) statusBadge.innerText = `STATUS: ${stText}`;

  // Icon Logic
  const serviceLower = (order.data?.service || "").toLowerCase();
  let iconUrl = "https://1000logos.net/wp-content/uploads/2022/09/Valorant-Emblem.png"; // Default Valo

  if (serviceLower.includes("apex")) iconUrl = "https://www.freepnglogos.com/uploads/apex-legends-logo-png/apex-game-png-logo-21.png";
  if (serviceLower.includes("lol") || serviceLower.includes("league")) iconUrl = "https://raw.githubusercontent.com/github/explore/b088bf18ff2af3f2216294ffb10f5a07eb55aa31/topics/league-of-legends/league-of-legends.png";
  if (serviceLower.includes("tft")) iconUrl = "https://raw.githubusercontent.com/github/explore/b088bf18ff2af3f2216294ffb10f5a07eb55aa31/topics/league-of-legends/league-of-legends.png";

  if (iconBox) iconBox.innerHTML = `<img src="${iconUrl}" style="width: 20px; height: 20px; object-fit: contain; filter: brightness(1.2);">`;
}

async function launchGame() {
  const list = document.getElementById("ordersList");
  const OrderId = list.value;
  if (!OrderId) return;

  const btn = document.getElementById("launchButton");
  const originalText = btn.innerHTML;

  // UI Loading State
  btn.setAttribute("disabled", "true");
  btn.innerText = "SYNCING CREDENTIALS...";

  try {
    const email = localStorage.getItem("user_email");
    const password = localStorage.getItem("user_password");

    // Get Credentials from API
    const res = await window.electronAPI.getOrderDetail({ orderId: OrderId, email, password });

    if (res.success && res.data) {
      const acc = res.data;
      console.log(`[AUTH] Dispatching Credentials -> User: ${acc.accountName} | Pass: ${acc.accountPassword}`);

      const rawData = localStorage.getItem(`order_${OrderId}_data`);
      const orderData = rawData ? JSON.parse(rawData) : {};

      const service = (orderData.data?.service || "").toLowerCase();
      let motor = "Valorant"; // Default
      if (service.includes("apex")) motor = "Apex";
      if (service.includes("lol") || service.includes("league")) motor = "LOL";
      if (service.includes("tft")) motor = "TFT";

      // Trigger Electron Launch
      if (window.electronAPI.launchGame) {
        window.electronAPI.launchGame({
          username: acc.accountName,
          password: acc.accountPassword,
          gameMotor: motor
        });
        showNotification("Protocol initiated. Game launching...", "success");
      }
    } else {
      showNotification(res.message || "Failed to retrieve account credentials.");
    }
  } catch (err) {
    console.error(err);
    showNotification("System Synchronization Error");
  } finally {
    setTimeout(() => {
      btn.removeAttribute("disabled");
      btn.innerHTML = originalText;
    }, 4000);
  }
}

// User Actions
window.login = function () {
  console.log("[DEBUG] window.login called");
  try {
    const emailInput = document.getElementById("username");
    const passInput = document.getElementById("password");

    if (!emailInput || !passInput) {
      console.error("[ERROR] Input elements not found");
      return;
    }

    if (!emailInput.value || !passInput.value) {
      showNotification("Identity fields cannot be empty.");
      return;
    }

    // Set Loading State
    const spin = document.getElementById("logSpin");
    const btn = document.getElementById("loginButton");
    if (spin) spin.classList.remove("hidden");
    if (btn) btn.setAttribute("disabled", "true");

    console.log("[DEBUG] Authenticating user:", emailInput.value);
    authenticateUser(emailInput.value, passInput.value);
  } catch (err) {
    console.error("[FATAL] Login function error:", err);
  }
}

window.logout = function () {
  localStorage.removeItem("user_password");
  localStorage.removeItem("user_email");
  location.reload();
}

window.demoSteamLogin = function () {
  console.log("[DEBUG] Demo Steam login triggered");
  window.electronAPI.launchGame({
    username: 'alixx234',
    password: 'Aliyabuz1990',
    gameMotor: 'steam'
  });
  if (typeof showConsole === 'function') showConsole();
  showNotification("Demo Steam Protocol initiated...", "success");
}

// Global Event Listeners
if (window.electronAPI && window.electronAPI.onLaunchError) {
  window.electronAPI.onLaunchError((message) => {
    showNotification(message, "error");
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const loginView = document.getElementById("loginView");
    if (loginView && loginView.style.display !== "none") {
      login();
    }
  }
});
