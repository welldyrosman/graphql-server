const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const { check, validationResult } = require("express-validator");

dotenv.config();

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: "postgres://default:DIJfbQl0Tp4A@ep-super-bush-a1526tnv.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require",
});

// Multer setup for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    // Allow only certain file types (e.g., jpeg, png)
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
  const timestamp = Date.now(); // Current time in milliseconds
  const randomString = uuidv4(); // Random string using UUID
  const fileExtension = originalFileName.split(".").pop(); // Original file extension

  // Combine timestamp, random string, and file extension to create a unique file name
  return `${timestamp}_${randomString}.${fileExtension}`;
}

router.use(express.json());

// Get all courses
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM public.\"Courses\"");
    res.json(rows);
  } catch (err) {
    console.error("Error retrieving courses:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a course by ID
router.get("/:id", async (req, res) => {
  const courseId = parseInt(req.params.id);
  try {
    const { rows } = await pool.query("SELECT * FROM public.\"Courses\" WHERE \"CourseID\" = $1", [courseId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "Course not found." });
    }
  } catch (err) {
    console.error("Error retrieving course:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create a new course
router.post(
  "/",
  upload.single("img"),
  [
    check("CourseName").notEmpty().withMessage("Course name is required"),
    check("CourseDescription").notEmpty().withMessage("Description is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    // Check if there are validation errors
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
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
      const img = "https://bucket.welldyrosman.my.id/courses/" + uniqueFileName; // Thumbnail image URL

      const { rows } = await pool.query(
        `INSERT INTO public."Courses" ("CourseName", "CourseDescription", "img") VALUES ($1, $2, $3) RETURNING *`,
        [CourseName, CourseDescription, img]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error("Error creating course:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update a course by ID
router.put("/:id", async (req, res) => {
  const courseId = parseInt(req.params.id);
  const { CourseName, CourseDescription } = req.body;
  const img = "https://a0b54ab90ddf86a22c1597039f330109.r2.cloudflarestorage.com/welldy"; // Thumbnail image URL

  try {
    const { rowCount } = await pool.query(
      `UPDATE public."Courses" SET "CourseName" = $1, "CourseDescription" = $2, "img" = $3 WHERE "CourseID" = $4`,
      [CourseName, CourseDescription, img, courseId]
    );

    if (rowCount > 0) {
      res.json({ id: courseId, CourseName, CourseDescription, img });
    } else {
      res.status(404).json({ message: "Course not found." });
    }
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a course by ID
router.delete("/:id", async (req, res) => {
  const courseId = parseInt(req.params.id);
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM public."Courses" WHERE "CourseID" = $1`,
      [courseId]
    );

    if (rowCount > 0) {
      res.json({ message: "Course successfully deleted." });
    } else {
      res.status(404).json({ message: "Course not found." });
    }
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
