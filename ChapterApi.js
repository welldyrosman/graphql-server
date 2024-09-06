const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { check, validationResult, body } = require("express-validator");

// Database connection configuration
const pool = new Pool({
  connectionString: "postgres://default:DIJfbQl0Tp4A@ep-super-bush-a1526tnv.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require",
});

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

// POST method to add or update chapters and topics
router.post("/:id", validateChapterData, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { chapters } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const chapter of chapters) {
      const { id, title, topics, del, courseId = req.params.id } = chapter;

      if (id && del) {
        // Delete chapter and its topics
        await client.query('DELETE FROM public."Materials" WHERE "ChapterID" = $1', [id]);
        await client.query('DELETE FROM public."Chapters" WHERE "ChapterID" = $1', [id]);
      } else {
        // Add or update chapter
        const chapterId = id ? id : await dbInsertChapter(client, courseId, title);

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
              await client.query('DELETE FROM public."Materials" WHERE "MaterialID" = $1', [
                topicId,
              ]);
            } else {
              // Add or update topic
              await dbInsertOrUpdateMaterial(
                client,
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

    await client.query("COMMIT");
    res.json({ message: "Chapter and topics updated successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

async function dbInsertChapter(client, courseId, chapterTitle) {
  const result = await client.query(
    `INSERT INTO public."Chapters" ("CourseID", "ChapterName") VALUES ($1, $2) RETURNING "ChapterID"`,
    [courseId, chapterTitle]
  );
  return result.rows[0].chapterid;
}

async function dbInsertOrUpdateMaterial(
  client,
  chapterId,
  topicId,
  topicTitle,
  content,
  publishDate
) {
  if (topicId) {
    await client.query(
      `UPDATE public."Materials" SET "MaterialTitle" = $1, "MaterialContent" = $2, "PublishDate" = $3 WHERE "MaterialID" = $4`,
      [topicTitle, content, publishDate, topicId]
    );
  } else {
    const result = await client.query(
      `INSERT INTO public."Materials" ("ChapterID", "MaterialTitle", "MaterialContent", "PublishDate") VALUES ($1, $2, $3, $4) RETURNING "MaterialID"`,
      [chapterId, topicTitle, content, publishDate]
    );
    return result.rows[0].materialid;
  }
}

router.get("/:courseId", async (req, res) => {
  const courseId = req.params.courseId;

  const client = await pool.connect();
  try {
    // Retrieve course data based on CourseID
    const courseResult = await client.query(
      `SELECT "CourseName", "CourseDescription" FROM public."Courses" WHERE "CourseID" = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courseResult.rows[0];

    // Retrieve chapter data based on CourseID
    const chaptersResult = await client.query(
      `SELECT "ChapterID", "ChapterName" FROM public."Chapters" WHERE "CourseID" = $1`,
      [courseId]
    );

    // Retrieve topics for each chapter
    const chaptersWithTopics = [];
    for (const chapter of chaptersResult.rows) {
      const topicsResult = await client.query(
        `SELECT "MaterialID" as id, "ChapterID", "MaterialTitle" as title FROM public."Materials" WHERE "ChapterID" = $1`,
        [chapter.ChapterID] // Use dot notation here
      );
      chaptersWithTopics.push({
        id: chapter.ChapterID, // Use dot notation here
        title: chapter.ChapterName, // Use dot notation here
        expand: true,
        topics: topicsResult.rows,
      });
    }

    // Return the result in the desired payload format
    res.json({
      CourseName: course.CourseName, // Use dot notation here
      CourseDescription: course.CourseDescription, // Use dot notation here
      chapters: chaptersWithTopics,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});



module.exports = router;
