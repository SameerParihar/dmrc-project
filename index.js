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

// 🔐 Station-specific database URLs from .env
const STATION_URLS = {
  "vaishali": process.env.DB_VAISHALI_URL,
  "anand vihar": process.env.DB_ANAND_URL,
  "xyz": process.env.DB_XYZ_URL, // Replace with real stations
};

let stationName = "vaishali";
let db = null;

function connectToStationDB(name) {
  const connectionString = STATION_URLS[name];

  if (!connectionString) {
    throw new Error(`No database URL configured for station: ${name}`);
  }

  return new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
}

function setDBConnection(newStation) {
  if (db) db.end();
  db = connectToStationDB(newStation);
  db.connect();
  stationName = newStation;
}

setDBConnection(stationName); // Initial connection
