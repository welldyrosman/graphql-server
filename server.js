const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const cors = require('cors');
const { Pool } = require('pg');

// Inisialisasi koneksi PostgreSQL
const pool = new Pool({
  connectionString: "postgres://default:DIJfbQl0Tp4A@ep-super-bush-a1526tnv.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require",
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
    return pool.query("SELECT * FROM visitors WHERE id = $1", [args.id])
      .then(res => res.rows[0])
      .catch(err => console.error(err));
  },
  getAllVisitors: () => {
    return pool.query("SELECT * FROM visitors")
      .then(res => res.rows)
      .catch(err => console.error(err));
  },
  createVisitor: ({ input }) => {
    return pool.query("INSERT INTO visitors (page, visitor) VALUES ($1, $2) RETURNING *", [input.page, input.visitor])
      .then(res => res.rows[0])
      .catch(err => console.error(err));
  },
  updateVisitor: ({ id, input }) => {
    return pool.query("UPDATE visitors SET page = $1, visitor = visitor + 1 WHERE id = $2 RETURNING *", [input.page, id])
      .then(res => res.rows[0])
      .catch(err => console.error(err));
  },
  deleteVisitor: ({ id }) => {
    return pool.query("DELETE FROM visitors WHERE id = $1", [id])
      .then(() => true)
      .catch(err => {
        console.error(err);
        return false;
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
