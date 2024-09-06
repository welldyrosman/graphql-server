// 20240906081323_create_tables_for_materials_courses_chapters_assignments_responses_visitors.js

exports.up = function(knex) {
    return knex.schema
      .createTable('Users', function(table) {
        table.increments('UserID').primary();
        table.string('UserName');
        table.string('UserEmail');
        table.string('Password');
        table.string('UserRole');
      })
      .createTable('Courses', function(table) {
        table.increments('CourseID').primary();
        table.string('CourseName');
        table.text('CourseDescription');
        table.string('img');
      })
      .createTable('Chapters', function(table) {
        table.increments('ChapterID').primary();
        table.integer('CourseID').unsigned().references('CourseID').inTable('Courses');
        table.string('ChapterName');
      })
      .createTable('Assignments', function(table) {
        table.increments('AssignmentID').primary();
        table.integer('ChapterID').unsigned().references('ChapterID').inTable('Chapters');
        table.string('AssignmentTitle');
        table.text('AssignmentDescription');
        table.string('AssignmentType');
        table.date('DueDate');
      })
      .createTable('AssignmentResponses', function(table) {
        table.increments('ResponseID').primary();
        table.integer('AssignmentID').unsigned().references('AssignmentID').inTable('Assignments');
        table.integer('StudentID').unsigned().references('UserID').inTable('Users');
        table.text('ResponseText');
        table.binary('ResponseFile');
      })
      .createTable('Materials', function(table) {
        table.increments('MaterialID').primary();
        table.integer('ChapterID').unsigned().references('ChapterID').inTable('Chapters');
        table.string('MaterialTitle');
        table.text('MaterialContent');
        table.date('PublishDate');
      })
      .createTable('Visitors', function(table) {
        table.increments('id').primary();
        table.string('page').notNullable();
        table.integer('visitor').notNullable();
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTableIfExists('Visitors')
      .dropTableIfExists('Materials')
      .dropTableIfExists('AssignmentResponses')
      .dropTableIfExists('Assignments')
      .dropTableIfExists('Chapters')
      .dropTableIfExists('Courses')
      .dropTableIfExists('Users');
  };
  