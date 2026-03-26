const apiBase = "";

function showMessage(text, isError = false) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.style.color = isError ? "red" : "green";
}

function getPassword() {
  return localStorage.getItem("adminPassword") || "";
}

function savePassword() {
  const password = document.getElementById("adminPassword").value.trim();

  if (!password) {
    showMessage("Add meg a jelszót!", true);
    return;
  }

  localStorage.setItem("adminPassword", password);
  showMessage("Jelszó elmentve.");
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-password": getPassword()
  };
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

  data.forEach(item => {
    const tr = document.createElement("tr");

    const tdClass = document.createElement("td");
    tdClass.textContent = item.class_name;

    const tdPoints = document.createElement("td");
    tdPoints.textContent = item.points;

    const tdAction = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Törlés";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => deleteClass(item.id, item.class_name);

    tdAction.appendChild(deleteBtn);

    tr.appendChild(tdClass);
    tr.appendChild(tdPoints);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
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
  loadClasses();
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
  loadClasses();
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
  loadClasses();
}

document.getElementById("adminPassword").value = getPassword();

loadAllowedClasses();
loadClasses();