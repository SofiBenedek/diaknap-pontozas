const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new Database("scores.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL UNIQUE,
    points INTEGER NOT NULL DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`).run();

const allowedClasses = [
  "9.A",
  "9.B",
  "9.NY",
  "10.A",
  "10.B",
  "10.C",
  "11.A",
  "11.B",
  "11.C",
  "12.A",
  "12.B",
  "12.C",
  "13.A",
  "13.B",
  "13.C"
];

function checkPassword(req, res, next) {
  const password = req.headers["x-admin-password"];

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Hibás jelszó!" });
  }

  next();
}

function normalizeClassName(className) {
  return className.trim().toUpperCase();
}

function isValidClassName(className) {
  return allowedClasses.includes(className);
}

function isValidPointValue(points) {
  const pointValue = Number(points);
  return !isNaN(pointValue) && pointValue >= 1 && pointValue <= 10;
}

function addHistory(className, actionType, points) {
  db.prepare(`
    INSERT INTO history (class_name, action_type, points, created_at)
    VALUES (?, ?, ?, ?)
  `).run(className, actionType, points, new Date().toISOString());
}

app.get("/api/classes", (req, res) => {
  const classes = db
    .prepare("SELECT * FROM classes ORDER BY points DESC, class_name ASC")
    .all();

  res.json(classes);
});

app.get("/api/allowed-classes", (req, res) => {
  res.json(allowedClasses);
});

app.get("/api/history", (req, res) => {
  const history = db
    .prepare("SELECT * FROM history ORDER BY id DESC LIMIT 100")
    .all();

  res.json(history);
});

app.post("/api/add-points", checkPassword, (req, res) => {
  const { className, points } = req.body;

  if (!className || points === undefined) {
    return res.status(400).json({ message: "Hiányzó adat!" });
  }

  const cleanClassName = normalizeClassName(className);
  const pointValue = Number(points);

  if (!cleanClassName) {
    return res.status(400).json({ message: "Az osztály neve kötelező!" });
  }

  if (!isValidClassName(cleanClassName)) {
    return res.status(400).json({
      message: "Csak a megadott osztályok használhatók: 9.A, 9.B, 9.NY, 10.A-13.C"
    });
  }

  if (!isValidPointValue(pointValue)) {
    return res.status(400).json({
      message: "A pontszám csak 1 és 10 közötti szám lehet!"
    });
  }

  const existing = db
    .prepare("SELECT * FROM classes WHERE class_name = ?")
    .get(cleanClassName);

  if (existing) {
    db.prepare(`
      UPDATE classes
      SET points = points + ?
      WHERE class_name = ?
    `).run(pointValue, cleanClassName);
  } else {
    db.prepare(`
      INSERT INTO classes (class_name, points)
      VALUES (?, ?)
    `).run(cleanClassName, pointValue);
  }

  addHistory(cleanClassName, "add", pointValue);

  res.json({ message: "Pont hozzáadva!" });
});

app.post("/api/remove-points", checkPassword, (req, res) => {
  const { className, points } = req.body;

  if (!className || points === undefined) {
    return res.status(400).json({ message: "Hiányzó adat!" });
  }

  const cleanClassName = normalizeClassName(className);
  const pointValue = Number(points);

  if (!cleanClassName) {
    return res.status(400).json({ message: "Az osztály neve kötelező!" });
  }

  if (!isValidClassName(cleanClassName)) {
    return res.status(400).json({
      message: "Csak a megadott osztályok használhatók: 9.A, 9.B, 9.NY, 10.A-13.C"
    });
  }

  if (!isValidPointValue(pointValue)) {
    return res.status(400).json({
      message: "A levonás csak 1 és 10 közötti szám lehet!"
    });
  }

  const existing = db
    .prepare("SELECT * FROM classes WHERE class_name = ?")
    .get(cleanClassName);

  if (!existing) {
    return res.status(404).json({ message: "Ilyen osztály nincs a rendszerben!" });
  }

  const newPoints = Math.max(0, existing.points - pointValue);

  db.prepare(`
    UPDATE classes
    SET points = ?
    WHERE class_name = ?
  `).run(newPoints, cleanClassName);

  addHistory(cleanClassName, "remove", pointValue);

  res.json({ message: "Pont levonva!" });
});

app.delete("/api/classes/:id", checkPassword, (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "Érvénytelen azonosító!" });
  }

  const existing = db
    .prepare("SELECT * FROM classes WHERE id = ?")
    .get(id);

  if (!existing) {
    return res.status(404).json({ message: "Az osztály nem található!" });
  }

  db.prepare("DELETE FROM classes WHERE id = ?").run(id);

  res.json({ message: "Az osztály törölve lett!" });
});

app.listen(PORT, () => {
  console.log(`A szerver fut a ${PORT} porton`);
});