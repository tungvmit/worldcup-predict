const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./data/db.sqlite");

// Bet configuration by round
const BET_CONFIG = {
  group: 10000,
  knockout: 20000,
  third: 50000,
  final: 100000
};

const MAX_PREDICTIONS_PER_RESULT = 4;
const WINNING_SHARE = 0.85;
const FUND_SHARE = 0.15;

// Initialize Database
db.serialize(() => {
  // Players table
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    total_bet INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Matches table
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    teamA TEXT NOT NULL,
    teamB TEXT NOT NULL,
    kickoff DATETIME NOT NULL,
    round TEXT NOT NULL,
    scoreA INTEGER,
    scoreB INTEGER,
    result_finalized BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Predictions table
  db.run(`CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    predA INTEGER NOT NULL,
    predB INTEGER NOT NULL,
    is_correct BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_id) REFERENCES players(id),
    FOREIGN KEY(match_id) REFERENCES matches(id),
    UNIQUE(player_id, match_id)
  )`);

  // Fund transactions table
  db.run(`CREATE TABLE IF NOT EXISTS fund_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(match_id) REFERENCES matches(id)
  )`);

  // Seed sample matches (2026 World Cup schedule)
  const matches = [
    // Group stage
    { id: 1, teamA: 'Brazil', teamB: 'Germany', kickoff: '2026-06-10 20:00', round: 'group' },
    { id: 2, teamA: 'France', teamB: 'Argentina', kickoff: '2026-06-11 20:00', round: 'group' },
    { id: 3, teamA: 'Spain', teamB: 'England', kickoff: '2026-06-12 20:00', round: 'group' },
    { id: 4, teamA: 'Netherlands', teamB: 'Belgium', kickoff: '2026-06-13 20:00', round: 'group' },
    // Knockout stage
    { id: 5, teamA: 'Winner1', teamB: 'Winner2', kickoff: '2026-07-01 20:00', round: 'knockout' },
    { id: 6, teamA: 'Winner3', teamB: 'Winner4', kickoff: '2026-07-02 20:00', round: 'knockout' },
    // Semi-finals
    { id: 7, teamA: 'Semi1', teamB: 'Semi2', kickoff: '2026-07-08 20:00', round: 'knockout' },
    { id: 8, teamA: 'Semi3', teamB: 'Semi4', kickoff: '2026-07-09 20:00', round: 'knockout' },
    // Third place
    { id: 9, teamA: 'Third1', teamB: 'Third2', kickoff: '2026-07-17 20:00', round: 'third' },
    // Final
    { id: 10, teamA: 'Final1', teamB: 'Final2', kickoff: '2026-07-19 20:00', round: 'final' }
  ];

  matches.forEach(m => {
    db.run(
      `INSERT OR IGNORE INTO matches (id, teamA, teamB, kickoff, round) VALUES (?, ?, ?, ?, ?)`,
      [m.id, m.teamA, m.teamB, m.kickoff, m.round]
    );
  });
});

// ============ API ENDPOINTS ============

// Get all matches
app.get("/api/matches", (req, res) => {
  db.all(
    `SELECT * FROM matches ORDER BY kickoff ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Get match by ID with predictions count
app.get("/api/matches/:id", (req, res) => {
  db.get(
    `SELECT * FROM matches WHERE id = ?`,
    [req.params.id],
    (err, match) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!match) return res.status(404).json({ error: "Match not found" });

      // Count predictions
      db.get(
        `SELECT COUNT(*) as count FROM predictions WHERE match_id = ?`,
        [req.params.id],
        (err, countRow) => {
          match.prediction_count = countRow.count;
          res.json(match);
        }
      );
    }
  );
});

// Make a prediction
app.post("/api/predict", (req, res) => {
  const { player, match_id, predA, predB } = req.body;

  // Validation
  if (!player || typeof player !== 'string' || player.trim().length === 0) {
    return res.status(400).json({ error: "Player name is required" });
  }
  if (!match_id || typeof predA !== 'number' || typeof predB !== 'number') {
    return res.status(400).json({ error: "Invalid prediction data" });
  }
  if (predA < 0 || predB < 0 || predA > 20 || predB > 20) {
    return res.status(400).json({ error: "Score must be 0-20" });
  }

  const playerName = player.trim();

  // Check match exists and kickoff hasn't passed
  db.get(`SELECT * FROM matches WHERE id = ?`, [match_id], (err, match) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!match) return res.status(404).json({ error: "Match not found" });

    const now = new Date();
    const kickoff = new Date(match.kickoff);

    if (kickoff <= now) {
      return res.status(400).json({ error: "Match has already started" });
    }

    // Check max predictions for this result
    db.get(
      `SELECT COUNT(*) as count FROM predictions 
       WHERE match_id = ? AND predA = ? AND predB = ?`,
      [match_id, predA, predB],
      (err, countRow) => {
        if (countRow.count >= MAX_PREDICTIONS_PER_RESULT) {
          return res.status(400).json({ 
            error: `Maximum ${MAX_PREDICTIONS_PER_RESULT} players can predict this score` 
          });
        }

        // Get or create player
        db.run(
          `INSERT OR IGNORE INTO players (name) VALUES (?)`,
          [playerName],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get(`SELECT id FROM players WHERE name = ?`, [playerName], (err, player) => {
              if (err) return res.status(500).json({ error: err.message });

              // Check if player already predicted this match
              db.get(
                `SELECT id FROM predictions WHERE player_id = ? AND match_id = ?`,
                [player.id, match_id],
                (err, existing) => {
                  if (existing) {
                    return res.status(400).json({ error: "You already predicted this match" });
                  }

                  // Insert prediction
                  db.run(
                    `INSERT INTO predictions (player_id, match_id, predA, predB)
                     VALUES (?, ?, ?, ?)`,
                    [player.id, match_id, predA, predB],
                    (err) => {
                      if (err) return res.status(500).json({ error: err.message });
                      res.json({ success: true, message: "Prediction saved" });
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  });
});

// Set match result (admin only in production)
app.post("/api/admin/set-result", (req, res) => {
  const { match_id, scoreA, scoreB } = req.body;

  if (typeof scoreA !== 'number' || typeof scoreB !== 'number') {
    return res.status(400).json({ error: "Invalid scores" });
  }

  db.get(`SELECT * FROM matches WHERE id = ?`, [match_id], (err, match) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!match) return res.status(404).json({ error: "Match not found" });

    // Update match result
    db.run(
      `UPDATE matches SET scoreA = ?, scoreB = ?, result_finalized = 1 WHERE id = ?`,
      [scoreA, scoreB, match_id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Mark correct predictions
        db.run(
          `UPDATE predictions SET is_correct = 1 
           WHERE match_id = ? AND predA = ? AND predB = ?`,
          [match_id, scoreA, scoreB],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Get all predictions for this match
            db.all(
              `SELECT COUNT(*) as total FROM predictions WHERE match_id = ?`,
              [match_id],
              (err, countResult) => {
                const totalPredictions = countResult[0].total;
                const totalPool = totalPredictions * BET_CONFIG[match.round];
                const fundAmount = Math.round(totalPool * FUND_SHARE);

                // Record fund transaction
                db.run(
                  `INSERT INTO fund_transactions (match_id, amount) VALUES (?, ?)`,
                  [match_id, fundAmount],
                  (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, message: "Result recorded" });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Get match results
app.get("/api/results/:id", (req, res) => {
  const matchId = req.params.id;

  db.get(`SELECT * FROM matches WHERE id = ?`, [matchId], (err, match) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!match) return res.status(404).json({ error: "Match not found" });

    const betAmount = BET_CONFIG[match.round];

    db.all(
      `SELECT pl.name, pr.predA, pr.predB, pr.is_correct
       FROM predictions pr
       JOIN players pl ON pl.id = pr.player_id
       WHERE pr.match_id = ?
       ORDER BY pr.is_correct DESC, pl.name ASC`,
      [matchId],
      (err, predictions) => {
        if (err) return res.status(500).json({ error: err.message });

        const winners = predictions.filter(p => p.is_correct).slice(0, MAX_PREDICTIONS_PER_RESULT);
        const totalPredictions = predictions.length;
        const totalPool = totalPredictions * betAmount;
        const fundAmount = Math.round(totalPool * FUND_SHARE);
        const winningPool = totalPool - fundAmount;
        const rewardPerWinner = winners.length > 0 ? Math.round(winningPool / winners.length) : 0;

        res.json({
          match,
          totalPredictions,
          totalPool,
          fundAmount,
          winningPool,
          winners: winners.map(w => ({ name: w.name, prediction: `${w.predA}-${w.predB}`, reward: rewardPerWinner })),
          allPredictions: predictions.map(p => ({
            name: p.name,
            prediction: `${p.predA}-${p.predB}`,
            isCorrect: p.is_correct
          }))
        });
      }
    );
  });
});

// Get tournament statistics
app.get("/api/statistics", (req, res) => {
  db.all(
    `SELECT pl.name, pl.total_bet, pl.total_won,
            COUNT(pr.id) as predictions_made,
            SUM(CASE WHEN pr.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions
     FROM players pl
     LEFT JOIN predictions pr ON pl.id = pr.player_id
     GROUP BY pl.id
     ORDER BY pl.total_won DESC`,
    (err, playerStats) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT COUNT(*) as total_matches FROM matches`,
        (err, matchCount) => {
          if (err) return res.status(500).json({ error: err.message });

          db.get(
            `SELECT SUM(amount) as total_fund FROM fund_transactions`,
            (err, fundRow) => {
              if (err) return res.status(500).json({ error: err.message });

              res.json({
                players: playerStats || [],
                totalMatches: matchCount.total_matches,
                totalFund: fundRow.total_fund || 0
              });
            }
          );
        }
      );
    }
  );
});

app.listen(3000, () => console.log("🚀 World Cup Prediction App running on port 3000"));
