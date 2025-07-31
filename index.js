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

const stationName = "vaishali"; // always use this DB

const db = new pg.Client({
  connectionString: process.env.DB_VAISHALI_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

db.connect()
  .then(() => console.log("✅ Connected to vaishali DB"))
  .catch((err) => {
    console.error("❌ Failed to connect to vaishali DB:", err.message);
    process.exit(1);
  });

app.get("/", (req, res) => {
  const selectedStation = req.query.station || "vaishali";
  res.render("index.ejs", {
    isHome: true,
    stationName: selectedStation
  });
});

app.post("/submit", (req, res) => {
  const selectedStation = req.body.station || "vaishali";
  res.redirect("/?station=" + selectedStation);
});

app.get("/waste", (req, res) => {
  const selectedStation = req.query.station || "vaishali";
  res.render("waste.ejs", {
    isHome: false,
    stationName: selectedStation
  });
});

app.get("/blue_bins", async (req, res) => {
  const selectedStation = req.query.station || "vaishali";
  try {
    const result = await db.query("SELECT * FROM blue_bins WHERE station = $1", [selectedStation]);
    res.render("blue_bins.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "blue_bins",
      stationName: selectedStation
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching blue_bins data");
  }
});

app.get("/green_bins", async (req, res) => {
  const selectedStation = req.query.station || "vaishali";
  try {
    const result = await db.query("SELECT * FROM green_bins WHERE station = $1", [selectedStation]);
    res.render("green_bins.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "green_bins",
      stationName: selectedStation
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching green_bins data");
  }
});

app.get("/chemicals", async (req, res) => {
  const selectedStation = req.query.station || "vaishali";
  try {
    const result = await db.query("SELECT * FROM chemicals WHERE station = $1", [selectedStation]);
    res.render("chemicals.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "chemicals",
      stationName: selectedStation
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching chemicals data");
  }
});

app.get("/employee", async (req, res) => {
  const selectedStation = req.query.station || "vaishali";
  try {
    const result = await db.query("SELECT * FROM employee WHERE station = $1", [selectedStation]);
    res.render("employee.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "employee",
      stationName: selectedStation
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching employee data");
  }
});

app.post("/add/:table", async (req, res) => {
  const table = req.params.table;
  const selectedStation = req.body.station || "vaishali";
  const cols = Object.keys(req.body);
  const vals = Object.values(req.body);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");

  try {
    await db.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      vals
    );
    res.redirect(`/${table}?station=${selectedStation}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Add failed: " + err.message);
  }
});

app.post("/update/:table", async (req, res) => {
  const table = req.params.table;
  const { key, keyValue, station, ...data } = req.body;

  const updates = Object.entries(data)
    .filter(([_, v]) => v.trim() !== "")
    .map(([col, _], i) => `${col} = $${i + 1}`)
    .join(", ");

  const values = Object.entries(data)
    .filter(([_, v]) => v.trim() !== "")
    .map(([_, v]) => v);

  values.push(keyValue); // WHERE key = $N

  try {
    await db.query(
      `UPDATE ${table} SET ${updates} WHERE ${key} = $${values.length}`,
      values
    );
    res.redirect(`/${table}?station=${station || "vaishali"}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
