const apiBase = "";

function showMessage(text, isError = false) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.style.color = isError ? "red" : "green";
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ className, points })
  });

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message, true);
    return;
  }

  showMessage(data.message);
  document.getElementById("addClassName").value = "";
  document.getElementById("addPoints").value = "";
  loadClasses();
}

async function removePoints() {
  const className = document.getElementById("removeClassName").value;
  const points = document.getElementById("removePoints").value;

  const res = await fetch(`${apiBase}/api/remove-points`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ className, points })
  });

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message, true);
    return;
  }

  showMessage(data.message);
  document.getElementById("removeClassName").value = "";
  document.getElementById("removePoints").value = "";
  loadClasses();
}

async function deleteClass(id, className) {
  const ok = confirm(`Biztosan törölni akarod ezt az osztályt: ${className}?`);

  if (!ok) return;

  const res = await fetch(`${apiBase}/api/classes/${id}`, {
    method: "DELETE"
  });

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message, true);
    return;
  }

  showMessage(data.message);
  loadClasses();
}

loadClasses();