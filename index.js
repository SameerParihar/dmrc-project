import express from "express";
import bodyparser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));

let stationName = "vaishali";
let db = null;

function connectToStationDB(name) {
  // Use DATABASE_URL if available (Render), else local fallback
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return new pg.Client({
      connectionString: connectionString.replace("dbname", name),
      ssl: { rejectUnauthorized: false }
    });
  } else {
    return new pg.Client({
      user: "postgres",
      host: "localhost",
      database: name,
      password: "Stech#1309",
      port: 5432
    });
  }
}

function setDBConnection(newStation) {
  if (db) db.end(); // Close old connection
  db = connectToStationDB(newStation);
  db.connect();
  stationName = newStation;
}

setDBConnection(stationName); // Initial connection

app.post("/submit", (req, res) => {
  const selectedStation = req.body.station;
  setDBConnection(selectedStation);
  res.redirect("/");
});

app.get("/waste", (req, res) => {
  res.render("waste.ejs", {
    isHome: false,
    stationName: stationName
  });
});

app.get("/", (req, res) => {
  res.render("index.ejs", {
    isHome: true,
    stationName: stationName
  });
});

app.get("/blue_bins", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM blue_bins");
    res.render("blue_bins.ejs", {
      isHome: false,
      rows: result.rows,
      tableName: "blue_bins",
      stationName: stationName
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
      stationName: stationName
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
      stationName: stationName
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
      stationName: stationName
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
    res.status(500).send("Add failed: " + err.message);
  }
});

app.post("/update/:table", async (req, res) => {
  const table = req.params.table;
  const { key, keyValue, ...data } = req.body;

  const updates = Object.entries(data)
    .filter(([_, v]) => v.trim() !== "") // Ignore blank fields
    .map(([col, _], i) => `${col} = $${i + 1}`)
    .join(", ");

  const values = Object.entries(data)
    .filter(([_, v]) => v.trim() !== "")
    .map(([_, v]) => v);

  values.push(keyValue); // For WHERE clause

  try {
    await db.query(
      `UPDATE ${table} SET ${updates} WHERE ${key} = $${values.length}`,
      values
    );
    res.redirect("/" + table);
  } catch (err) {
    res.status(500).send("Update failed: " + err.message);
  }
});

// Listen using environment port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
