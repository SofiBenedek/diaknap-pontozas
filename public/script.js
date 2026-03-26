const apiBase = "";

function showMessage(text, isError = false) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.style.color = isError ? "#f87171" : "#4ade80";
}

function getPassword() {
  return localStorage.getItem("adminPassword") || "";
}

function isLoggedIn() {
  return !!getPassword();
}

function updateAdminUI() {
  const adminActions = document.getElementById("adminActions");
  const logoutButton = document.getElementById("logoutButton");
  const adminStatus = document.getElementById("adminStatus");
  const passwordInput = document.getElementById("adminPassword");

  if (isLoggedIn()) {
    adminActions.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
    adminStatus.textContent = "Bejelentkezve";
    passwordInput.value = getPassword();
  } else {
    adminActions.classList.add("hidden");
    logoutButton.classList.add("hidden");
    adminStatus.textContent = "Nincs bejelentkezve";
    passwordInput.value = "";
  }
}

function savePassword() {
  const password = document.getElementById("adminPassword").value.trim();

  if (!password) {
    showMessage("Add meg a jelszót!", true);
    return;
  }

  localStorage.setItem("adminPassword", password);
  updateAdminUI();
  loadHistory();
  showMessage("Jelszó elmentve.");
}

function logout() {
  localStorage.removeItem("adminPassword");
  updateAdminUI();
  loadHistory();
  showMessage("Sikeres kijelentkezés.");
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-password": getPassword()
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

    if (isLoggedIn()) {
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

async function loadHistory() {
  const historyList = document.getElementById("historyList");
  const password = getPassword();

  if (!password) {
    historyList.innerHTML = `
      <div class="history-empty">
        Jelentkezz be az előzmények megtekintéséhez.
      </div>
    `;
    return;
  }

  const res = await fetch(`${apiBase}/api/history`, {
    headers: {
      "x-admin-password": password
    }
  });

  if (res.status === 401) {
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

    row.innerHTML = `
      <div class="history-main">
        <div class="history-top">
          <span class="${badgeClass}">${badgeText}</span>
          <strong>${item.class_name}</strong>
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
  const className = document.getElementById("addClassName").value;
  const points = document.getElementById("addPoints").value;

  const res = await fetch(`${apiBase}/api/add-points`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ className, points })
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
  const className = document.getElementById("removeClassName").value;
  const points = document.getElementById("removePoints").value;

  const res = await fetch(`${apiBase}/api/remove-points`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ className, points })
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
  const ok = confirm(`Biztosan törölni akarod ezt az osztályt: ${className}?`);

  if (!ok) return;

  const res = await fetch(`${apiBase}/api/classes/${id}`, {
    method: "DELETE",
    headers: {
      "x-admin-password": getPassword()
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
}

updateAdminUI();
loadAllowedClasses();
refreshAll();