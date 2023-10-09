const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const router = express.Router();
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const databaseDirectory = __dirname + "/database.db";
console.log("path", databaseDirectory);
const db = new sqlite3.Database(databaseDirectory);

router.use(express.json());
router.get("/", (req, res) => {
  db.all("SELECT * FROM visitors", (err, rows) => {
    if (err) {
      console.error("Error retrieving visitors:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(rows);
    }
  });
});
router.get("/:id", (req, res) => {
  const visitorId = parseInt(req.params.id);
  db.get("SELECT * FROM visitors WHERE id = ?", [visitorId], (err, row) => {
    if (err) {
      console.error("Error retrieving visitor:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: "Pengunjung tidak ditemukan." });
    }
  });
});

// Membuat pengunjung baru
router.post("/", (req, res) => {
  const { page, visitor } = req.body;
  db.run("INSERT INTO visitors (page, visitor) VALUES (?, ?)", [page, visitor], function (err) {
    if (err) {
      console.error("Error creating visitor:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ id: this.lastID, page, visitor });
    }
  });
});

// Memperbarui pengunjung berdasarkan ID
// Memperbarui pengunjung berdasarkan ID
router.put("/:id", (req, res) => {
  const visitorId = parseInt(req.params.id);
  const { page, visitor } = req.body;

  db.get("SELECT visitor FROM visitors WHERE id = ?", [visitorId], (err, row) => {
    if (err) {
      console.error("Error retrieving visitor:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else if (row) {
      const updatedVisitor = row.visitor + 1;

      db.run("UPDATE visitors SET page = ?, visitor = ? WHERE id = ?", [page, updatedVisitor, visitorId], (err) => {
        if (err) {
          console.error("Error updating visitor:", err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res.json({ id: visitorId, page, visitor: updatedVisitor });
        }
      });
    } else {
      db.run("INSERT INTO visitors (id, page, visitor) VALUES (?, ?, ?)", [visitorId, page, 1], (err) => {
        if (err) {
          console.error("Error creating visitor:", err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res.json({ id: visitorId, page, visitor: 1 });
        }
      });
    }
  });
});


// Menghapus pengunjung berdasarkan ID
router.delete("/:id", (req, res) => {
  const visitorId = parseInt(req.params.id);
  db.run("DELETE FROM visitors WHERE id = ?", [visitorId], (err) => {
    if (err) {
      console.error("Error deleting visitor:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ message: "Pengunjung berhasil dihapus." });
    }
  });
});

module.exports = router;
