const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./data/db.sqlite");

// Init DB
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    teamA TEXT,
    teamB TEXT,
    kickoff DATETIME,
    round TEXT,
    scoreA INTEGER,
    scoreB INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    match_id INTEGER,
    predA INTEGER,
    predB INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed data
  db.run(`
    INSERT OR IGNORE INTO matches (id, teamA, teamB, kickoff, round)
    VALUES
    (1,'Brazil','Germany','2026-06-10 20:00','group'),
    (2,'France','Argentina','2026-06-11 20:00','group'),
    (3,'Spain','England','2026-06-15 20:00','knockout')
  `);
});

// Bet config
function getBetAmount(round) {
  return {
    group: 10000,
    knockout: 20000,
    third: 50000,
    final: 100000
  }[round] || 10000;
}

// API: get matches
app.get("/matches", (req, res) => {
  db.all("SELECT * FROM matches", (err, rows) => res.json(rows));
});

// API: predict
app.post("/predict", (req, res) => {
  const { player, match_id, predA, predB } = req.body;

  db.get("SELECT * FROM matches WHERE id=?", [match_id], (err, match) => {
    if (!match) return res.status(404).send("No match");

    if (new Date(match.kickoff) < new Date()) {
      return res.status(400).send("Match started");
    }

    db.run("INSERT OR IGNORE INTO players(name) VALUES(?)", [player]);

    db.get("SELECT id FROM players WHERE name=?", [player], (err, p) => {
      db.run(`
        INSERT INTO predictions(player_id, match_id, predA, predB)
        VALUES (?, ?, ?, ?)
      `, [p.id, match_id, predA, predB]);

      res.send({ success: true });
    });
  });
});

// API: results
app.get("/results/:id", (req, res) => {
  db.get("SELECT * FROM matches WHERE id=?", [req.params.id], (err, match) => {

    db.all(`
      SELECT pl.name, pr.predA, pr.predB
      FROM predictions pr
      JOIN players pl ON pl.id = pr.player_id
      WHERE pr.match_id=?
    `, [req.params.id], (err, rows) => {

      const correct = rows.filter(r =>
        r.predA == match.scoreA && r.predB == match.scoreB
      );

      const winners = correct.slice(0, 4);
      const total = rows.length * getBetAmount(match.round);

      res.json({
        totalPool: total,
        fund: total * 0.15,
        winners,
        rewardEach: winners.length ? (total * 0.85 / winners.length) : 0
      });
    });
  });
});

app.listen(3000, () => console.log("Running on 3000"));
