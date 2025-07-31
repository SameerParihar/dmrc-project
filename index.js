import express from "express";
import bodyparser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Station DB URLs
const STATION_URLS = {
  "vaishali": process.env.DB_VAISHALI_URL,
  "anand vihar": process.env.DB_ANAND_VIHAR_URL,
  "mayur vihar": process.env.DB_MAYUR_VIHAR_URL,
};

console.log("ENV CHECK:");
for (const [key, val] of Object.entries(STATION_URLS)) {
  console.log(`${key}: ${val}`);
}

let stationName = "vaishali";
let db = null;

async function connectToStationDB(name) {
  const connectionString = STATION_URLS[name];
  if (!connectionString) {
    throw new Error(`❌ No DB URL found for station "${name}"`);
  }

  const useSSL = process.env.NODE_ENV === "production";
  const client = new pg.Client({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log(`✅ Connected to database for station "${name}"`);
    return client;
  } catch (err) {
    console.error(`❌ Failed to connect to "${name}" DB:`, err.message);
    throw err;
  }
}

async function setDBConnection(newStation) {
  if (newStation === stationName && db) return;

  if (!STATION_URLS[newStation]) {
    throw new Error(`❌ Invalid station "${newStation}"`);
  }

  if (db) {
    await db.end();
    console.log(`🔌 Disconnected from previous DB "${stationName}"`);
  }

  db = await connectToStationDB(newStation);
  stationName = newStation;
}

// Initial connection
setDBConnection(stationName).catch((err) => {
  console.error("🚨 Initial DB connection failed:", err.message);
  process.exit(1);
});

app.post("/submit", async (req, res) => {
  const selectedStation = req.body.station;
  try {
    await setDBConnection(selectedStation);
    res.redirect("/");
  } catch (err) {
    res.status(500).send("DB switch failed: " + err.message);
  }
});

app.get("/", (req, res) => {
  res.render("index.ejs", {
    isHome: true,
    stationName
  });
});

app.get("/waste", (req, res) => {
  res.render("waste.ejs", {
    isHome: false,
    stationName
  });
});

app.get("/blue_bins", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM blue_bins");
    res.render("blue_bins.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "blue_bins",
      stationName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching blue_bins data");
  }
});

app.get("/green_bins", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM green_bins");
    res.render("green_bins.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "green_bins",
      stationName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching green_bins data");
  }
});

app.get("/chemicals", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM chemicals");
    res.render("chemicals.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "chemicals",
      stationName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching chemicals data");
  }
});

app.get("/employee", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM employee");
    res.render("employee.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "employee",
      stationName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching employee data");
  }
});

app.post("/add/:table", async (req, res) => {
  const table = req.params.table;
  const cols = Object.keys(req.body);
  const vals = Object.values(req.body);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");

  try {
    await db.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      vals
    );
    res.redirect("/" + table);
  } catch (err) {
    console.error(err);
    res.status(500).send("Add failed: " + err.message);
  }
});

app.post("/update/:table", async (req, res) => {
  const table = req.params.table;
  const { key, keyValue, ...data } = req.body;

  const updates = Object.entries(data)
    .filter(([_, v]) => v.trim() !== "")
    .map(([col, _], i) => `${col} = $${i + 1}`)
    .join(", ");

  const values = Object.entries(data)
    .filter(([_, v]) => v.trim() !== "")
    .map(([_, v]) => v);

  values.push(keyValue); // WHERE clause

  try {
    await db.query(
      `UPDATE ${table} SET ${updates} WHERE ${key} = $${values.length}`,
      values
    );
    res.redirect("/" + table);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
