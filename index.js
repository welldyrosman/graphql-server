const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const cors = require('cors');
const sqlite3 = require("sqlite3").verbose();
const databaseDirectory = __dirname + '/database.db';
console.log("path",databaseDirectory);
const db = new sqlite3.Database(databaseDirectory);

// Inisialisasi basis data SQLite
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS visitors (id INTEGER PRIMARY KEY, page TEXT, visitor INTEGER)");
});

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Visitor {
    id: Int
    page: String
    visitor: Int
  }
  
  input VisitorInput {
    page: String
    visitor: Int
  }

  type Query {
    getVisitor(id: Int): Visitor
    getAllVisitors: [Visitor]
  }

  type Mutation {
    createVisitor(input: VisitorInput): Visitor
    updateVisitor(id: Int, input: VisitorInput): Visitor
    deleteVisitor(id: Int): Boolean
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  getVisitor: (args) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM visitors WHERE id = ?", [args.id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },
  getAllVisitors: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM visitors", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },
  createVisitor: ({ input }) => {
    return new Promise((resolve, reject) => {
      db.run("INSERT INTO visitors (page, visitor) VALUES (?, ?)", [input.page, input.visitor], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...input });
        }
      });
    });
  },
  updateVisitor: ({ id, input }) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT visitor FROM visitors WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          // Mengambil nilai visitor saat ini dan menambahkannya dengan 1
          const updatedVisitor = row.visitor + 1;
          
          // Melakukan update ke basis data dengan nilai visitor yang baru
          db.run("UPDATE visitors SET page = ?, visitor = ? WHERE id = ?", [input.page, updatedVisitor, id], (err) => {
            if (err) {
              reject(err);
            } else {
              // Mengembalikan data yang telah di-update
              resolve({ id, page: input.page, visitor: updatedVisitor });
            }
          });
        }
      });
    });
  },  
  deleteVisitor: ({ id }) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM visitors WHERE id = ?", [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
};

var app = express();
app.use(cors());

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);

app.listen(4000, () => {
  console.log("Running a GraphQL API server at http://localhost:4000/graphql");
});
