const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { check, validationResult } = require("express-validator");

const pool = new Pool({
  connectionString: "postgres://default:DIJfbQl0Tp4A@ep-super-bush-a1526tnv.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require",
});

router.use(express.json());

// Mendapatkan materi berdasarkan ID
router.get("/:materialId", async (req, res) => {
  const materialId = req.params.materialId;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM "Materials" WHERE "MaterialID" = $1',
      [materialId]
    );

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "Materi tidak ditemukan." });
    }
  } catch (err) {
    console.error("Error retrieving material:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Memperbarui materi berdasarkan ID
router.put(
  "/:materialId",
  [
    check("MaterialTitle").notEmpty().withMessage("Material title is required."),
    check("MaterialContent").notEmpty().withMessage("Material content is required."),
  ],
  async (req, res) => {
    const materialId = req.params.materialId;
    const { MaterialTitle, MaterialContent } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await pool.query(
        'UPDATE "Materials" SET "MaterialTitle" = $1, "MaterialContent" = $2 WHERE "MaterialID" = $3 RETURNING *',
        [MaterialTitle, MaterialContent, materialId]
      );

      if (result.rowCount > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ message: "Materi tidak ditemukan." });
      }
    } catch (err) {
      console.error("Error updating material:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = router;
