const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const { check, validationResult, body } = require("express-validator");

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
router.use(express.urlencoded({ extended: true }));

const validateChapterData = [
  body("chapters")
    .notEmpty()
    .withMessage("Chapters are required.")
    .isArray({ min: 1 })
    .withMessage("At least one chapter is required."),
  body("chapters.*.title").notEmpty().withMessage("Chapter title is required."),
  body("chapters.*.topics")
    .optional()
    .isArray()
    .withMessage("Each chapter must have at least one topic."),
  body("chapters.*.topics.*.title")
    .notEmpty()
    .withMessage("Topic title is required."),
];
// Menggunakan method POST untuk menambahkan atau memperbarui chapter dan topics
router.post("/:id", validateChapterData, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { chapters } = req.body;

  try {
    for (const chapter of chapters) {
      const { id, title, topics, del, courseId = req.params.id } = chapter;

      if (id && del) {
        // Delete chapter and its topics
        await db.run("DELETE FROM materials WHERE ChapterID = ?", [id]);
        await db.run("DELETE FROM chapters WHERE ChapterID = ?", [id]);
      } else {
        // Add or update chapter
        console.log(chapter.ChapterName);
        const chapterId = id ? id : await dbInsertChapter(courseId, title);

        if (topics && topics.length > 0) {
          for (const topic of topics) {
            const {
              id: topicId,
              title: topicTitle,
              content,
              publishDate,
              del: topicDel,
            } = topic;

            if (topicId && topicDel) {
              // Delete topic
              await db.run("DELETE FROM materials WHERE MaterialID = ?", [
                topicId,
              ]);
            } else {
              // Add or update topic
              await dbInsertOrUpdateMaterial(
                chapterId,
                topicId,
                topicTitle,
                content,
                publishDate
              );
            }
          }
        }
      }
    }

    res.json({ message: "Chapter and topics updated successfully." });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function dbInsertChapter(courseId, chapterTitle) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO chapters (CourseID, ChapterName) VALUES (?, ?)",
      [courseId, chapterTitle],
      function (err) {
        if (err) {
          reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
}

async function dbInsertOrUpdateMaterial(
  chapterId,
  topicId,
  topicTitle,
  content,
  publishDate
) {
  return new Promise((resolve, reject) => {
    db.run(
      topicId
        ? "UPDATE materials SET MaterialTitle = ?, MaterialContent = ?, PublishDate = ? WHERE MaterialID = ?"
        : "INSERT INTO materials (ChapterID, MaterialTitle, MaterialContent, PublishDate) VALUES (?, ?, ?, ?)",
      topicId
        ? [topicTitle, content, publishDate, topicId]
        : [chapterId, topicTitle, content, publishDate],
      function (err) {
        if (err) {
          reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
}

router.get("/:courseId", async (req, res) => {
  const courseId = req.params.courseId;

  try {
    // Mengambil data course dari database berdasarkan CourseID
    const course = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM courses WHERE CourseID = ?",
        [courseId],
        (err, course) => {
          if (err) {
            console.error("Error retrieving courses:", err);
            reject(err);
          }
          resolve(course);
        }
      );
    });

    // Mengambil data chapter dari database berdasarkan CourseID
    const chapters = await new Promise((resolve, reject) => {
      db.all(
        "SELECT ChapterID, ChapterName FROM chapters WHERE CourseID = ?",
        [courseId],
        async (err, chapters) => {
          if (err) {
            console.error("Error retrieving chapters:", err);
            reject(err);
          } else {
            // Mendefinisikan fungsi untuk mengambil topics (Materials) dari database berdasarkan ChapterID
            const getTopics = (chapterId) => {
              return new Promise((resolve, reject) => {
                db.all(
                  "SELECT MaterialID as id, ChapterID, MaterialTitle as title FROM materials WHERE ChapterID = ?",
                  [chapterId],
                  (err, topics) => {
                    if (err) {
                      console.error(
                        "Error retrieving topics (materials):",
                        err
                      );
                      reject(err);
                    }
                    resolve(topics);
                  }
                );
              });
            };

            // Menggunakan async/await untuk mendapatkan topics untuk setiap chapter
            const chaptersWithTopics = [];
            for (const chapter of chapters) {
              const topics = await getTopics(chapter.ChapterID);
              chaptersWithTopics.push({
                id: chapter.ChapterID,
                title: chapter.ChapterName,
                expand: true,
                topics: topics,
              });
            }

            resolve(chaptersWithTopics);
          }
        }
      );
    });

    // Mengembalikan hasil dalam format payload yang diinginkan
    res.json({
      CourseName: course.CourseName,
      CourseDescription: course.CourseDescription,
      chapters: chapters,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
