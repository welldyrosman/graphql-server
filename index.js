const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema"); // Import skema GraphQL
const CourseApi = require("./CourseApi"); // Import API kursus
const VisitorApi = require("./VisitorApi"); // Import API pengunjung
const ChapterApi = require("./ChapterApi");
const MaterialApi = require("./MaterialApi");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use("/api/courses", CourseApi); // Gunakan API kursus di rute '/api/courses'
app.use("/api/visitors", VisitorApi); // Gunakan API pengunjung di rute '/api/visitors'
app.use("/api/chapters", ChapterApi);
app.use("/api/materi", MaterialApi);
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema, // Gunakan skema GraphQL
    graphiql: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
