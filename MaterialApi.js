const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const { check, validationResult } = require("express-validator");

const databaseDirectory = __dirname + "/database.db";
const db = new sqlite3.Database(
  databaseDirectory,
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.log("Error when creating the database", err);
    }
  }
);

router.use(express.json());

// Mendapatkan materi berdasarkan ID
router.get("/:materialId", (req, res) => {
  const materialId = req.params.materialId;

  db.get(
    "SELECT * FROM materials WHERE MaterialID = ?",
    [materialId],
    (err, material) => {
      if (err) {
        console.error("Error retrieving material:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else if (material) {
        res.json(material);
      } else {
        res.status(404).json({ message: "Materi tidak ditemukan." });
      }
    }
  );
});

// Memperbarui materi berdasarkan ID
router.put(
  "/:materialId",
  [
    check("MaterialTitle").notEmpty().withMessage("Material title is required."),
    check("MaterialContent").notEmpty().withMessage("Material content is required."),
  ],
  (req, res) => {
    const materialId = req.params.materialId;
    const { MaterialTitle, MaterialContent } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    db.run(
      "UPDATE materials SET MaterialTitle = ?, MaterialContent = ? WHERE MaterialID = ?",
      [MaterialTitle, MaterialContent, materialId],
      function (err) {
        if (err) {
          console.error("Error updating material:", err);
          res.status(500).json({ error: err });
        } else {
          res.json({
            id: materialId,
            MaterialTitle: MaterialTitle,
            MaterialContent: MaterialContent,
          });
        }
      }
    );
  }
);

module.exports = router;
