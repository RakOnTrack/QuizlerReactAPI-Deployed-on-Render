// // Test calls for directory API calls
// const {
//   createTestDirectory,
//   createTestQuiz,
//   updateDir,
//   updateQuiz,
// } = require("./utils.js");
// const request = require("supertest");
// const express = require("express");
// const db = require("./database.js");
// /* const app = require("./quiz.test"); */
// const directory_routes = require("../routes/directory.routes.js");
// const quiz_routes = require("../routes/quiz.routes.js");

// const app = express();

// // Middleware for parsing JSON request bodies
// app.use(express.json());

// app.use("/api/directory", directory_routes);
// app.use("/api/quizzes", quiz_routes);

// jest.setTimeout(90000);

// describe("Directory API Tests", () => {
//   // Connects to the test database before all the tests in this suite
//   beforeAll(async () => {
//     await db.connect();
//   });

//   // Disconnects to the test database after all the tests in this suite
//   afterAll(async () => {
//     await db.close();
//   });

//   /** Test Case 1:
//    * Creates a directory given a title name, no parent directory
//    */
//   describe("POST /api/directory", () => {
//     it("should create a directory, no sub or parent directory", async () => {
//       const postResult = await createTestDirectory(app, "Test Directory Title");

//       expect(postResult.status).toBe(200);
//     });
//   });

//   /** Test Case 2:
//    * Creates a directory given a title name, there is a parent directory
//    */
//   describe("POST /api/directory", () => {
//     it("should create a directory with a parent directory", async () => {
//       let parentDirectory = await createTestDirectory(app, "Parent directory");

//       const postResult = await createTestDirectory(
//         app,
//         "Child Directory",
//         parentDirectory.body._id
//       );

//       // The post result body is the parentDirectory.
//       expect(postResult.status).toBe(200);
//       expect(postResult.body.parentDirectory).toBe(parentDirectory.body._id);

//       // check to see if the parent is updated by using the read function.
//       parentDirectory = await updateDir(app, parentDirectory);
//       expect(parentDirectory.body.subdirectories.length).toBe(1);
//     });
//   });

//   // Test Case 2.1: Create directory without providing a name
//   describe("POST /api/directory", () => {
//     it("should return an error when name is not provided", async () => {
//       const postResult = await request(app).post("/api/directory").send({});

//       expect(postResult.status).toBe(400);
//       expect(postResult.body).toHaveProperty("error");
//     });
//   });

//   // Test Case 2.2: Create directory with an invalid parent directory ID
//   describe("POST /api/directory", () => {
//     it("should return an error when the parent directory ID is invalid", async () => {
//       const postResult = await request(app)
//         .post("/api/directory")
//         .send({ name: "Test Directory", parentDirectoryId: "invalidID" });

//       expect(postResult.status).toBe(401);
//       expect(postResult.body).toHaveProperty("error");
//     });
//   });

//   // Test Case 2.3: Create directory with a non-existent parent directory
//   describe("POST /api/directory", () => {
//     it("should return an error when the parent directory does not exist", async () => {
//       const postResult = await request(app)
//         .post("/api/directory")
//         .send({ name: "Test Directory", parentDirectoryId: "nonexistentID" });

//       expect(postResult.status).toBe(401);
//       expect(postResult.body).toHaveProperty("error");
//     });
//   });

//   /** Test Case 2:
//    // reading a directory
//    */
//   describe("get /api/directory/", () => {
//     it("should create and read a new directory", async () => {
//       const parentDirectory1 = await createTestDirectory(
//         app,
//         "Parent Directory 1"
//       );

//       expect(parentDirectory1.status).toBe(200);
//       expect(parentDirectory1.body).toHaveProperty("_id");
//       expect(parentDirectory1.body).toHaveProperty("name");
//       expect(parentDirectory1.body).toHaveProperty("subdirectories");
//       expect(parentDirectory1.body).toHaveProperty("quizzes");

//       const getResult = await updateDir(app, parentDirectory1);

//       expect(getResult.body).toHaveProperty("_id");
//       expect(getResult.body).toHaveProperty("name");
//       expect(getResult.body).toHaveProperty("subdirectories");
//       expect(getResult.body).toHaveProperty("quizzes");
//     });
//   });

//   /** Test Case 5: **/

//   describe("PUT /api/directory/moveDir", () => {
//     it("should move a directory to a new parent directory", async () => {
//       let parentDirectory1 = await createTestDirectory(
//         app,
//         "Parent Directory 1"
//       );
//       let parentDirectory2 = await createTestDirectory(
//         app,
//         "Parent Directory 2"
//       );
//       let directoryToMove = await createTestDirectory(
//         app,
//         "Directory to Move",
//         parentDirectory1.body._id
//       );

//       parentDirectory1 = await updateDir(app, parentDirectory1);
//       parentDirectory2 = await updateDir(app, parentDirectory2);
//       directoryToMove = await updateDir(app, directoryToMove);

//       expect(parentDirectory1.body.subdirectories.length).toBe(1);
//       expect(parentDirectory2.body.subdirectories.length).toBe(0);
//       expect(directoryToMove.body.parentDirectory).toBe(
//         parentDirectory1.body._id
//       );

//       //// Moves directoryToMove from parent1 to parent2:
//       await request(app).put("/api/directory/moveDir").send({
//         directoryId: directoryToMove.body._id,
//         newParentId: parentDirectory2.body._id,
//       });

//       parentDirectory1 = await updateDir(app, parentDirectory1);
//       parentDirectory2 = await updateDir(app, parentDirectory2);
//       directoryToMove = await updateDir(app, directoryToMove);

//       expect(parentDirectory1.body.subdirectories.length).toBe(0);
//       expect(parentDirectory2.body.subdirectories.length).toBe(1);
//       expect(directoryToMove.body.parentDirectory).toBe(
//         parentDirectory2.body._id
//       );
//     });
//   });

//   // Test Case 5.1: Move directory to a non-existent parent directory
//   describe("PUT /api/directory/moveDir", () => {
//     it("should return an error when the new parent directory does not exist", async () => {
//       const moveResult = await request(app).put("/api/directory/moveDir").send({
//         directoryId: "directoryToMoveID",
//         newParentId: "nonexistentParentID",
//       });

//       expect(moveResult.status).toBe(401);
//       expect(moveResult.body).toHaveProperty("error");
//     });
//   });

//   // Test Case 5.2: Move directory to itself
//   describe("PUT /api/directory/moveDir", () => {
//     it("should return an error when moving a directory to itself", async () => {
//       const moveResult = await request(app).put("/api/directory/moveDir").send({
//         directoryId: "directoryToMoveID",
//         newParentId: "directoryToMoveID",
//       });

//       expect(moveResult.status).toBe(401);
//       expect(moveResult.body).toHaveProperty("error");
//     });
//   });

//   /** Test Case 6: **/

//   describe("PUT /api/directory/moveQuiz", () => {
//     it("should move a quiz to a new parent directory", async () => {
//       let parentDirectory1 = await createTestDirectory(
//         app,
//         "Parent Directory 1"
//       );
//       let parentDirectory2 = await createTestDirectory(
//         app,
//         "Parent Directory 2"
//       );
//       let quizToMove = await createTestQuiz(
//         app,
//         "quiz to Move",
//         parentDirectory1.body._id
//       );

//       parentDirectory1 = await updateDir(app, parentDirectory1);
//       parentDirectory2 = await updateDir(app, parentDirectory2);
//       quizToMove = await updateQuiz(app, quizToMove);

//       expect(parentDirectory1.body.quizzes.length).toBe(1);
//       expect(parentDirectory2.body.quizzes.length).toBe(0);
//       expect(quizToMove.body.parentDirectory).toBe(parentDirectory1.body._id);

//       //// Moves directoryToMove from parent1 to parent2:
//       await request(app).put("/api/directory/moveQuiz").send({
//         quizId: quizToMove.body._id,
//         newDirectoryId: parentDirectory2.body._id,
//       });

//       parentDirectory1 = await updateDir(app, parentDirectory1);
//       parentDirectory2 = await updateDir(app, parentDirectory2);
//       quizToMove = await updateQuiz(app, quizToMove);

//       expect(parentDirectory1.body.quizzes.length).toBe(0);
//       expect(parentDirectory2.body.quizzes.length).toBe(1);
//       expect(quizToMove.body.parentDirectory).toBe(parentDirectory2.body._id);
//     });
//   });

//   /** Test Case 6: **/

//   describe("delete /api/directory", () => {
//     it("should delete a directory and its items", async () => {
//       const directoryToDelete = await createTestDirectory(
//         app,
//         "Directory to Delete"
//       );
//       const quizToDelete = await createTestQuiz(
//         app,
//         "Quiz to Delete",
//         directoryToDelete._id
//       );
//       const subdirectoryToDelete = await createTestDirectory(
//         app,
//         "Subdirectory to Delete",
//         directoryToDelete.body._id
//       );

//       const deleteResult = await request(app)
//         .delete("/api/directory")
//         .send({ directoryId: directoryToDelete.body._id });

//       expect(deleteResult.status).toBe(200);

//       //test call to read quizToDelete, to see if it returns 401 error.
//       const deleteResult2 = await request(app)
//         .delete("/api/directory")
//         .send({ directoryId: directoryToDelete.body._id });

//       expect(deleteResult2.status).toBe(401);
//     });
//   });

//   // Test Case 6.1: Delete a non-existent directory
//   describe("delete /api/directory", () => {
//     it("should return an error when the directory to delete does not exist", async () => {
//       const deleteResult = await request(app)
//         .delete("/api/directory")
//         .send({ directoryId: "nonexistentID" });

//       expect(deleteResult.status).toBe(401);
//       expect(deleteResult.body).toHaveProperty("error");
//     });
//   });

//   // Test Case 6.2: Delete the root directory
//   describe("delete /api/directory", () => {
//     it("should return an error when attempting to delete the root directory", async () => {
//       const deleteResult = await request(app)
//         .delete("/api/directory")
//         .send({ directoryId: process.env.DEFAULT_ROOT_DIRECTORY });

//       expect(deleteResult.status).toBe(401);
//       expect(deleteResult.body).toHaveProperty("error");
//     });
//   });

//   /** Test Case 7: **/

//   describe("PUT /api/directory/switch-order", () => {
//     it("should switch the order of quizzes and subdirectories", async () => {
//       let mainDir = await createTestDirectory(app, "Quiz Main");

//       const quiz1 = await createTestQuiz(app, "Quiz 1", mainDir.body._id);
//       const quiz2 = await createTestQuiz(app, "Quiz 2", mainDir.body._id);

//       const subdirectory1 = await createTestDirectory(
//         app,
//         "Subdirectory 1",
//         mainDir.body._id
//       );
//       const subdirectory2 = await createTestDirectory(
//         app,
//         "Subdirectory 2",
//         mainDir.body._id
//       );

//       mainDir = await updateDir(app, mainDir);

//       expect(mainDir.body.quizzes[0].quizTitle).toBe(quiz1.body.quizTitle);
//       expect(mainDir.body.subdirectories[0].name).toBe(subdirectory1.body.name);

//       const putResult = await request(app)
//         .put("/api/directory/switch-order")
//         .send({
//           directoryId: mainDir.body._id,
//           newQuizIdOrder: [quiz2.body._id, quiz1.body._id],
//           newSubDirIdOrder: [subdirectory2.body._id, subdirectory1.body._id],
//         });

//       mainDir = await updateDir(app, mainDir);

//       expect(putResult.status).toBe(200);
//       expect(mainDir.body.quizzes[0].quizTitle).toBe(quiz2.body.quizTitle);
//       expect(mainDir.body.subdirectories[0].name).toBe(subdirectory2.body.name);
//     });
//   });

//   // Test Case 8.1: Switch the order with invalid quiz or subdirectory IDs
//   describe("PUT /api/directory/switch-order", () => {
//     it("should return an error with invalid quiz or subdirectory IDs", async () => {
//       const putResult = await request(app)
//         .put("/api/directory/switch-order")
//         .send({
//           directoryId: "directoryID",
//           newQuizIdOrder: ["invalidQuizID"],
//           newSubDirIdOrder: ["invalidSubDirID"],
//         });

//       expect(putResult.status).toBe(401);
//       expect(putResult.body).toHaveProperty("error");
//     });
//   });

//   // Test Case 8.2: Switch the order with mismatched array lengths
//   describe("PUT /api/directory/switch-order", () => {
//     it("should return an error with mismatched array lengths", async () => {
//       const mainDir = await createTestDirectory(app, "Quiz Main");

//       const quiz1 = await createTestQuiz(app, "Quiz 1", mainDir.body._id);
//       const quiz2 = await createTestQuiz(app, "Quiz 2", mainDir.body._id);

//       // const subdirectory1 = await createTestDirectory(

//       const putResult = await request(app)
//         .put("/api/directory/switch-order")
//         .send({
//           directoryId: mainDir.body._id,
//           newQuizIdOrder: [quiz1.body._id],
//           newSubDirIdOrder: [],
//         });

//       expect(putResult.status).toBe(401);
//       expect(putResult.body).toHaveProperty("error");
//     });
//   });

//   /** Test Case 9: **/

//   describe("Test Case: Check Parent Directory Quizzes Length", () => {
//     it("should expect parentDirectory quizzes length to be 0 after deleting quiz", async () => {
//       let parentDirectory = await createTestDirectory(app, "Parent Directory");
//       const quizToDelete = await createTestQuiz(
//         app,
//         "Quiz",
//         parentDirectory.body._id
//       );

//       parentDirectory = await updateDir(app, parentDirectory);
//       expect(parentDirectory.body.quizzes.length).toBe(1);

//       const deleteResult = await request(app).delete(
//         `/api/quizzes/${quizToDelete.body._id}`
//       ); // Use the correct endpoint for deleting a quiz

//       expect(deleteResult.status).toBe(200);
//       parentDirectory = await updateDir(app, parentDirectory);
//       expect(parentDirectory.body.quizzes.length).toBe(0);

//       // expect(deleteResult.status).toBe(200);
//     });
//     // });
//     // });
//   });
// });
