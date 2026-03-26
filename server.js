const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

const allowedStations = Array.from({ length: 15 }, (_, i) => i + 1);

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

function isValidStation(station) {
  const stationValue = Number(station);
  return allowedStations.includes(stationValue);
}

async function addHistory(className, stationNumber, actionType, points) {
  await supabase.from("history").insert({
    class_name: className,
    station_number: stationNumber,
    action_type: actionType,
    points: points
  });
}

async function getStationTotalForClass(className, stationNumber) {
  const { data, error } = await supabase
    .from("history")
    .select("points, action_type")
    .eq("class_name", className)
    .eq("station_number", stationNumber);

  if (error) {
    throw error;
  }

  let total = 0;

  for (const item of data) {
    if (item.action_type === "add") {
      total += item.points;
    } else if (item.action_type === "remove") {
      total -= item.points;
    }
  }

  return Math.max(0, total);
}

app.post("/api/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Hibás jelszó!" });
  }

  res.json({ message: "Sikeres bejelentkezés." });
});

app.get("/api/classes", async (req, res) => {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("points", { ascending: false })
    .order("class_name", { ascending: true });

  if (error) {
    return res.status(500).json({ message: "Hiba az adatok lekérésekor!" });
  }

  res.json(data);
});

app.get("/api/allowed-classes", (req, res) => {
  res.json(allowedClasses);
});

app.get("/api/stations", (req, res) => {
  res.json(allowedStations);
});

app.get("/api/history", checkPassword, async (req, res) => {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ message: "Hiba az előzmények lekérésekor!" });
  }

  res.json(data);
});

app.post("/api/add-points", checkPassword, async (req, res) => {
  const { className, stationNumber, points } = req.body;

  if (!className || !stationNumber || points === undefined) {
    return res.status(400).json({ message: "Hiányzó adat!" });
  }

  const cleanClassName = normalizeClassName(className);
  const pointValue = Number(points);
  const stationValue = Number(stationNumber);

  if (!isValidClassName(cleanClassName)) {
    return res.status(400).json({
      message: "Csak a megadott osztályok használhatók!"
    });
  }

  if (!isValidStation(stationValue)) {
    return res.status(400).json({
      message: "Csak 1 és 15 közötti állomás használható!"
    });
  }

  if (!isValidPointValue(pointValue)) {
    return res.status(400).json({
      message: "A pontszám csak 1 és 10 közötti szám lehet!"
    });
  }

  try {
    const stationTotal = await getStationTotalForClass(cleanClassName, stationValue);

    if (stationTotal + pointValue > 10) {
      return res.status(400).json({
        message: `Ez az állomás ennek az osztálynak már ${stationTotal} pontot adott. Összesen maximum 10 pont adható.`
      });
    }

    const { data: existing, error: selectError } = await supabase
      .from("classes")
      .select("*")
      .eq("class_name", cleanClassName)
      .maybeSingle();

    if (selectError) {
      return res.status(500).json({ message: "Hiba az osztály lekérésekor!" });
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("classes")
        .update({ points: existing.points + pointValue })
        .eq("id", existing.id);

      if (updateError) {
        return res.status(500).json({ message: "Hiba a pont hozzáadásakor!" });
      }
    } else {
      const { error: insertError } = await supabase
        .from("classes")
        .insert({
          class_name: cleanClassName,
          points: pointValue
        });

      if (insertError) {
        return res.status(500).json({ message: "Hiba az új osztály létrehozásakor!" });
      }
    }

    await addHistory(cleanClassName, stationValue, "add", pointValue);

    res.json({ message: "Pont hozzáadva!" });
  } catch (error) {
    res.status(500).json({ message: "Hiba a művelet során!" });
  }
});

app.post("/api/remove-points", checkPassword, async (req, res) => {
  const { className, stationNumber, points } = req.body;

  if (!className || !stationNumber || points === undefined) {
    return res.status(400).json({ message: "Hiányzó adat!" });
  }

  const cleanClassName = normalizeClassName(className);
  const pointValue = Number(points);
  const stationValue = Number(stationNumber);

  if (!isValidClassName(cleanClassName)) {
    return res.status(400).json({
      message: "Csak a megadott osztályok használhatók!"
    });
  }

  if (!isValidStation(stationValue)) {
    return res.status(400).json({
      message: "Csak 1 és 15 közötti állomás használható!"
    });
  }

  if (!isValidPointValue(pointValue)) {
    return res.status(400).json({
      message: "A levonás csak 1 és 10 közötti szám lehet!"
    });
  }

  try {
    const stationTotal = await getStationTotalForClass(cleanClassName, stationValue);

    if (stationTotal - pointValue < 0) {
      return res.status(400).json({
        message: `Erről az állomásról ennél az osztálynál csak ${stationTotal} pont vonható vissza.`
      });
    }

    const { data: existing, error: selectError } = await supabase
      .from("classes")
      .select("*")
      .eq("class_name", cleanClassName)
      .maybeSingle();

    if (selectError) {
      return res.status(500).json({ message: "Hiba az osztály lekérésekor!" });
    }

    if (!existing) {
      return res.status(404).json({ message: "Ilyen osztály nincs a rendszerben!" });
    }

    const newPoints = Math.max(0, existing.points - pointValue);

    const { error: updateError } = await supabase
      .from("classes")
      .update({ points: newPoints })
      .eq("id", existing.id);

    if (updateError) {
      return res.status(500).json({ message: "Hiba a pont levonásakor!" });
    }

    await addHistory(cleanClassName, stationValue, "remove", pointValue);

    res.json({ message: "Pont levonva!" });
  } catch (error) {
    res.status(500).json({ message: "Hiba a művelet során!" });
  }
});

app.delete("/api/classes/:id", checkPassword, async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "Érvénytelen azonosító!" });
  }

  const { data: existing, error: selectError } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (selectError) {
    return res.status(500).json({ message: "Hiba az osztály lekérésekor!" });
  }

  if (!existing) {
    return res.status(404).json({ message: "Az osztály nem található!" });
  }

  const { error: historyDeleteError } = await supabase
    .from("history")
    .delete()
    .eq("class_name", existing.class_name);

  if (historyDeleteError) {
    return res.status(500).json({ message: "Hiba az előzmények törlésekor!" });
  }

  const { error: classDeleteError } = await supabase
    .from("classes")
    .delete()
    .eq("id", id);

  if (classDeleteError) {
    return res.status(500).json({ message: "Hiba az osztály törlésekor!" });
  }

  res.json({ message: "Az osztály és az összes hozzá tartozó előzmény törölve lett!" });
});

app.listen(PORT, () => {
  console.log(`A szerver fut a ${PORT} porton`);
});