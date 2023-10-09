const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type Course {
    id: ID
    courseName: String
    description: String
  }
  
  input CourseInput {
    courseName: String
    description: String
  }

  type Visitor {
    id: ID
    page: String
    visitor: Int
  }
  
  input VisitorInput {
    page: String
    visitor: Int
  }

  type Query {
    getCourse(id: ID): Course
    getAllCourses: [Course]
    getVisitor(id: ID): Visitor
    getAllVisitors: [Visitor]
  }

  type Mutation {
    createCourse(input: CourseInput): Course
    updateCourse(id: ID, input: CourseInput): Course
    deleteCourse(id: ID): Boolean
    createVisitor(input: VisitorInput): Visitor
    updateVisitor(id: ID, input: VisitorInput): Visitor
    deleteVisitor(id: ID): Boolean
  }
`);

module.exports = schema;
