const apiBase = "";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 60 * 1000;

let isAdminAuthenticated = false;

function showMessage(text, isError = false) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.style.color = isError ? "#f87171" : "#4ade80";
}

function getStoredPassword() {
  return localStorage.getItem("adminPassword") || "";
}

function setStoredPassword(password) {
  localStorage.setItem("adminPassword", password);
}

function clearStoredPassword() {
  localStorage.removeItem("adminPassword");
}

function getFailedLoginCount() {
  return Number(localStorage.getItem("failedLoginCount") || "0");
}

function setFailedLoginCount(count) {
  localStorage.setItem("failedLoginCount", String(count));
}

function getLoginLockedUntil() {
  return Number(localStorage.getItem("loginLockedUntil") || "0");
}

function setLoginLockedUntil(timestamp) {
  localStorage.setItem("loginLockedUntil", String(timestamp));
}

function clearLoginLock() {
  localStorage.removeItem("loginLockedUntil");
  localStorage.removeItem("failedLoginCount");
}

function isLoginLocked() {
  const lockedUntil = getLoginLockedUntil();

  if (!lockedUntil) return false;

  if (Date.now() >= lockedUntil) {
    clearLoginLock();
    return false;
  }

  return true;
}

function getRemainingLockSeconds() {
  const lockedUntil = getLoginLockedUntil();
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-password": getStoredPassword()
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getRankBadge(index) {
  if (index === 0) {
    return `<span class="rank-badge gold">🥇 1.</span>`;
  }

  if (index === 1) {
    return `<span class="rank-badge silver">🥈 2.</span>`;
  }

  if (index === 2) {
    return `<span class="rank-badge bronze">🥉 3.</span>`;
  }

  return `<span class="rank-number">${index + 1}.</span>`;
}

function updateAdminUI() {
  const adminActions = document.getElementById("adminActions");
  const logoutButton = document.getElementById("logoutButton");
  const adminStatus = document.getElementById("adminStatus");
  const passwordInput = document.getElementById("adminPassword");

  if (isAdminAuthenticated) {
    adminActions.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
    adminStatus.textContent = "Bejelentkezve";
    passwordInput.value = getStoredPassword();
  } else {
    adminActions.classList.add("hidden");
    logoutButton.classList.add("hidden");

    if (isLoginLocked()) {
      adminStatus.textContent = `Túl sok hibás próbálkozás. Várj ${getRemainingLockSeconds()} másodpercet.`;
    } else {
      adminStatus.textContent = "Nincs bejelentkezve";
    }
  }
}

async function verifySavedPasswordOnLoad() {
  const savedPassword = getStoredPassword();

  if (!savedPassword) {
    isAdminAuthenticated = false;
    updateAdminUI();
    return;
  }

  const res = await fetch(`${apiBase}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password: savedPassword })
  });

  if (res.ok) {
    isAdminAuthenticated = true;
    clearLoginLock();
  } else {
    isAdminAuthenticated = false;
    clearStoredPassword();
  }

  updateAdminUI();
}

async function savePassword() {
  if (isLoginLocked()) {
    showMessage(`Túl sok hibás próbálkozás. Próbáld újra ${getRemainingLockSeconds()} mp múlva.`, true);
    updateAdminUI();
    return;
  }

  const password = document.getElementById("adminPassword").value.trim();

  if (!password) {
    showMessage("Add meg a jelszót!", true);
    return;
  }

  const res = await fetch(`${apiBase}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });

  const data = await res.json();

  if (!res.ok) {
    const failedCount = getFailedLoginCount() + 1;
    setFailedLoginCount(failedCount);

    isAdminAuthenticated = false;
    clearStoredPassword();

    if (failedCount >= MAX_LOGIN_ATTEMPTS) {
      setLoginLockedUntil(Date.now() + LOCK_TIME_MS);
      showMessage("Túl sok hibás jelszó. 1 percig nem próbálkozhatsz.", true);
    } else {
      showMessage("Hibás jelszó.", true);
    }

    updateAdminUI();
    loadHistory();
    loadClasses();
    return;
  }

  setStoredPassword(password);
  isAdminAuthenticated = true;
  clearLoginLock();
  updateAdminUI();
  loadHistory();
  loadClasses();
  showMessage("Bejelentkezve.");
}

function logout() {
  clearStoredPassword();
  isAdminAuthenticated = false;
  updateAdminUI();
  loadHistory();
  loadClasses();
  showMessage("Sikeres kijelentkezés.");
}

async function loadAllowedClasses() {
  const res = await fetch(`${apiBase}/api/allowed-classes`);
  const data = await res.json();

  const addSelect = document.getElementById("addClassName");
  const removeSelect = document.getElementById("removeClassName");

  addSelect.innerHTML = "";
  removeSelect.innerHTML = "";

  data.forEach(className => {
    const option1 = document.createElement("option");
    option1.value = className;
    option1.textContent = className;
    addSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = className;
    option2.textContent = className;
    removeSelect.appendChild(option2);
  });
}

async function loadStations() {
  const res = await fetch(`${apiBase}/api/stations`);
  const data = await res.json();

  const addSelect = document.getElementById("addStationNumber");
  const removeSelect = document.getElementById("removeStationNumber");

  addSelect.innerHTML = "";
  removeSelect.innerHTML = "";

  data.forEach(stationNumber => {
    const option1 = document.createElement("option");
    option1.value = stationNumber;
    option1.textContent = `${stationNumber}. állomás`;
    addSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = stationNumber;
    option2.textContent = `${stationNumber}. állomás`;
    removeSelect.appendChild(option2);
  });
}

async function loadClasses() {
  const res = await fetch(`${apiBase}/api/classes`);
  const data = await res.json();

  const tbody = document.getElementById("classTableBody");
  tbody.innerHTML = "";

  data.forEach((item, index) => {
    const tr = document.createElement("tr");

    if (index === 0) tr.classList.add("top1-row");
    if (index === 1) tr.classList.add("top2-row");
    if (index === 2) tr.classList.add("top3-row");

    const tdRank = document.createElement("td");
    tdRank.innerHTML = getRankBadge(index);

    const tdClass = document.createElement("td");
    tdClass.textContent = item.class_name;
    if (index < 3) {
      tdClass.classList.add("top-class-name");
    }

    const tdPoints = document.createElement("td");
    tdPoints.textContent = item.points;

    const tdAction = document.createElement("td");

    if (isAdminAuthenticated) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Törlés";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = () => deleteClass(item.id, item.class_name);
      tdAction.appendChild(deleteBtn);
    } else {
      tdAction.innerHTML = `<span class="action-lock">🔒 Admin</span>`;
    }

    tr.appendChild(tdRank);
    tr.appendChild(tdClass);
    tr.appendChild(tdPoints);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

async function loadStationBreakdown() {
  const res = await fetch(`${apiBase}/api/station-breakdown`);
  const data = await res.json();

  const thead = document.getElementById("stationBreakdownHead");
  const tbody = document.getElementById("stationBreakdownBody");

  if (!thead || !tbody) return;

  thead.innerHTML = "";
  tbody.innerHTML = "";

  const classNames = Object.keys(data);

  if (classNames.length === 0) {
    thead.innerHTML = `
      <tr>
        <th>Osztály</th>
        <th>Megjegyzés</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td colspan="2">Még nincs állomásbontási adat.</td>
      </tr>
    `;
    return;
  }

  const stationSet = new Set();

  classNames.forEach(className => {
    Object.keys(data[className]).forEach(stationNumber => {
      stationSet.add(Number(stationNumber));
    });
  });

  const stations = Array.from(stationSet).sort((a, b) => a - b);

  let headHtml = "<tr><th>Osztály</th>";
  stations.forEach(station => {
    headHtml += `<th>${station}. állomás</th>`;
  });
  headHtml += "<th>Összesen</th></tr>";

  thead.innerHTML = headHtml;

  classNames.sort().forEach(className => {
    let total = 0;
    let rowHtml = `<tr><td>${className}</td>`;

    stations.forEach(station => {
      const value = data[className][station] || 0;
      total += value;
      rowHtml += `<td>${value}</td>`;
    });

    rowHtml += `<td><strong>${total}</strong></td></tr>`;
    tbody.innerHTML += rowHtml;
  });
}

async function loadHistory() {
  const historyList = document.getElementById("historyList");

  if (!isAdminAuthenticated) {
    historyList.innerHTML = `
      <div class="history-empty">
        Jelentkezz be az előzmények megtekintéséhez.
      </div>
    `;
    return;
  }

  const res = await fetch(`${apiBase}/api/history`, {
    headers: {
      "x-admin-password": getStoredPassword()
    }
  });

  if (res.status === 401) {
    isAdminAuthenticated = false;
    clearStoredPassword();
    updateAdminUI();

    historyList.innerHTML = `
      <div class="history-empty">
        Hibás jelszó.
      </div>
    `;
    return;
  }

  const data = await res.json();

  historyList.innerHTML = "";

  if (data.length === 0) {
    historyList.innerHTML = `<div class="history-empty">Még nincs előzmény.</div>`;
    return;
  }

  data.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const badgeClass = item.action_type === "add" ? "history-badge add" : "history-badge remove";
    const badgeText = item.action_type === "add" ? "Hozzáadás" : "Levonás";
    const pointsText = item.action_type === "add" ? `+${item.points}` : `-${item.points}`;
    const stationText = item.station_number ? `${item.station_number}. állomás` : "Ismeretlen állomás";

    row.innerHTML = `
      <div class="history-main">
        <div class="history-top">
          <span class="${badgeClass}">${badgeText}</span>
          <strong>${item.class_name}</strong>
          <span class="station-badge">${stationText}</span>
        </div>
        <div class="history-time">${formatDate(item.created_at)}</div>
      </div>
      <div class="history-points ${item.action_type === "add" ? "plus" : "minus"}">
        ${pointsText}
      </div>
    `;

    historyList.appendChild(row);
  });
}

async function addPoints() {
  if (!isAdminAuthenticated) {
    showMessage("Ehhez előbb be kell jelentkezned.", true);
    return;
  }

  const className = document.getElementById("addClassName").value;
  const stationNumber = document.getElementById("addStationNumber").value;
  const points = document.getElementById("addPoints").value;

  const res = await fetch(`${apiBase}/api/add-points`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ className, stationNumber, points })
  });

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message, true);
    return;
  }

  showMessage(data.message);
  document.getElementById("addPoints").value = "";
  refreshAll();
}

async function removePoints() {
  if (!isAdminAuthenticated) {
    showMessage("Ehhez előbb be kell jelentkezned.", true);
    return;
  }

  const className = document.getElementById("removeClassName").value;
  const stationNumber = document.getElementById("removeStationNumber").value;
  const points = document.getElementById("removePoints").value;

  const res = await fetch(`${apiBase}/api/remove-points`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ className, stationNumber, points })
  });

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message, true);
    return;
  }

  showMessage(data.message);
  document.getElementById("removePoints").value = "";
  refreshAll();
}

async function deleteClass(id, className) {
  if (!isAdminAuthenticated) {
    showMessage("Ehhez előbb be kell jelentkezned.", true);
    return;
  }

  const ok = confirm(`Biztosan törölni akarod ezt az osztályt: ${className}?`);

  if (!ok) return;

  const res = await fetch(`${apiBase}/api/classes/${id}`, {
    method: "DELETE",
    headers: {
      "x-admin-password": getStoredPassword()
    }
  });

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message, true);
    return;
  }

  showMessage(data.message);
  refreshAll();
}



async function exportCsv() {
  const res = await fetch(`${apiBase}/api/classes`);
  const data = await res.json();

  if (!data || data.length === 0) {
    showMessage("Nincs mit exportálni.", true);
    return;
  }

  let csvContent = "Hely,Osztály,Pont\n";

  data.forEach((item, index) => {
    csvContent += `${index + 1},${item.class_name},${item.points}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  const now = new Date();

  const fileName = `diaknap-pontok-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}.csv`;

  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);

  showMessage("CSV export sikeres.");
}

function refreshAll() {
  loadClasses();
  loadHistory();
  loadStationBreakdown();
}

async function initApp() {
  updateAdminUI();
  await verifySavedPasswordOnLoad();
  await loadAllowedClasses();
  await loadStations();
  refreshAll();
}

initApp();