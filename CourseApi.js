const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const { check, validationResult } = require("express-validator");

dotenv.config();
const databaseDirectory = __dirname + "/database.db";
const db = new sqlite3.Database(databaseDirectory);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    // Izinkan hanya file dengan tipe tertentu (mis., jpeg, png)
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, JPG, or PNG files are allowed"), false);
    }
  },
});
function generateUniqueFileName(originalFileName) {
  const timestamp = Date.now(); // Waktu sekarang dalam milidetik
  const randomString = uuidv4(); // String acak menggunakan UUID
  const fileExtension = originalFileName.split(".").pop(); // Ekstensi file asli

  // Gabungkan waktu, string acak, dan ekstensi file untuk membuat nama file unik
  return `${timestamp}_${randomString}.${fileExtension}`;
}
router.use(express.json());

// Mengambil semua kursus
router.get("/", (req, res) => {
  db.all("SELECT * FROM courses", (err, rows) => {
    if (err) {
      console.error("Error retrieving courses:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(rows);
    }
  });
});

// Mengambil kursus berdasarkan ID
router.get("/:id", (req, res) => {
  const courseId = parseInt(req.params.id);
  db.get("SELECT * FROM courses WHERE id = ?", [courseId], (err, row) => {
    
    if (err) {
      console.error("Error retrieving course:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: "Kursus tidak ditemukan." });
    }
  });
});

// Membuat kursus baru
router.post(
  "/",
  upload.single("img"),
  [
    // Menambahkan validasi untuk courseName dan description menggunakan express-validator
    check("CourseName").notEmpty().withMessage("Course name is required"),
    check("CourseDescription").notEmpty().withMessage("Description is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    // Cek apakah terdapat kesalahan validasi
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const S3 = new S3Client({
      region: "auto",
      endpoint: process.env.ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    const uniqueFileName = generateUniqueFileName(req.file.originalname);
    await S3.send(
      new PutObjectCommand({
        Body: req.file.buffer,
        Bucket: "welldy",
        Key: "courses/" + uniqueFileName,
        ContentType: req.file.mimetype,
      })
    );
    const { CourseName, CourseDescription } = req.body;
    const img = "https://bucket.welldyrosman.my.id/courses/" + uniqueFileName; // URL gambar thumbnail
    db.run(
      "INSERT INTO courses (CourseName, CourseDescription, img) VALUES (?, ?, ?)",
      [CourseName, CourseDescription, img],
      function (err) {
        if (err) {
          console.error("Error creating course:", err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res.json({ id: this.lastID, CourseName, CourseDescription, img });
        }
      }
    );
  }
);

// Memperbarui kursus berdasarkan ID
router.put("/:id", (req, res) => {
  const courseId = parseInt(req.params.id);
  const { courseName, description } = req.body;
  const img =
    "https://a0b54ab90ddf86a22c1597039f330109.r2.cloudflarestorage.com/welldy"; // URL gambar thumbnail
  db.run(
    "UPDATE courses SET courseName = ?, description = ?, img = ? WHERE id = ?",
    [courseName, description, img, courseId],
    (err) => {
      if (err) {
        console.error("Error updating course:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json({ id: courseId, courseName, description, img });
      }
    }
  );
});

// Menghapus kursus berdasarkan ID
router.delete("/:id", (req, res) => {
  const courseId = parseInt(req.params.id);
  db.run("DELETE FROM courses WHERE id = ?", [courseId], (err) => {
    if (err) {
      console.error("Error deleting course:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ message: "Kursus berhasil dihapus." });
    }
  });
});

module.exports = router;
