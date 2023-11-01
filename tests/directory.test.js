// Test calls for directory API calls

const request = require("supertest");
const express = require("express");
const db = require("./database");
/* const app = require("./quiz.test"); */
const directory_routes = require("../routes/directory.routes.js");

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

app.use("/api/directory", directory_routes);

jest.setTimeout(90000);

async function createTestDirectory(app, name, parentDirectoryId = null) {
  const postResult = await request(app).post("/api/directory").send({
    name: name,
    parentDirectoryId: parentDirectoryId,
  });

  return postResult;
}

async function getDirectoryById(app, directoryId) {
  const getResult = await request(app).get(`/api/directory/${directoryId}`);
  return getResult.body;
}

describe("Directory API Tests", () => {
  // Connects to the test database before all the tests in this suite
  beforeAll(async () => {
    await db.connect();
  });

  // Disconnects to the test database after all the tests in this suite
  afterAll(async () => {
    await db.close();
  });

  /** Test Case 1:
   * Creates a directory given a title name, no parent directory
   */
  describe("POST /api/directory", () => {
    it("should create a directory, no sub or parent directory", async () => {
      // let testDirectoryTitle = "Test Directory Title";

      // const postResult = await request(app).post("/api/directory").send({
      //   name: testDirectoryTitle,
      //   parentDirectoryId: null,
      // });

      // let testDirectoryTitle = "";

      const postResult = await createTestDirectory(app, "Test Directory Title");

      expect(postResult.status).toBe(200);
    });
  });

  /** Test Case 2:
   * Creates a directory given a title name, there is a parent directory
   */

  describe("POST /api/directory", () => {
    it("should create a directory with a parent directory", async () => {
      const parentDirectory = await createTestDirectory(
        app,
        "Parent directory"
      );

      const testDirectoryTitle = "Test Directory Title";

      // const postResult = await request(app).post("/api/directory").send({
      //   name: testDirectoryTitle,
      //   parentDirectoryId: parentDirectory.body._id,
      // });
      const postResult = await createTestDirectory(
        app,
        testDirectoryTitle,
        parentDirectory.body._id
      );

      // The post result body is the parentDirectory.
      expect(postResult.status).toBe(200);
      expect(postResult.body.parentDirectory).toBe(parentDirectory.body._id);

      // check to see if the parent is updated by using the read function.
      const updatedParentDirectory = await getDirectoryById(
        app,
        parentDirectory.body._id
      );
      expect(updatedParentDirectory.subdirectories.length).toBe(1);
    });
  });

  // reading a directory
  describe("get /api/directory/", () => {
    it("should create and read a new directory", async () => {
      const parentDirectory1 = await createTestDirectory(
        app,
        "Parent Directory 1"
      );

      const getResult = await request(app).get(
        "/api/directory/" + parentDirectory1.body._id
      );

      expect(getResult.status).toBe(200);
      expect(getResult.body.directory).toHaveProperty("_id");
      expect(getResult.body.directory).toHaveProperty("name");
      expect(getResult.body).toHaveProperty("subdirectories");
      expect(getResult.body).toHaveProperty("quizzes");
    });
  });

  describe("PUT /api/directory/move", () => {
    it("should move a directory to a new parent directory", async () => {
      let parentDirectory1 = await createTestDirectory(
        app,
        "Parent Directory 1"
      );
      let parentDirectory2 = await createTestDirectory(
        app,
        "Parent Directory 2"
      );
      let directoryToMove = await createTestDirectory(
        app,
        "Directory to Move",
        parentDirectory1.body._id
      );

      parentDirectory1 = await getDirectoryById(app, parentDirectory1.body._id);
      parentDirectory2 = await getDirectoryById(app, parentDirectory2.body._id);
      directoryToMove = await getDirectoryById(app, directoryToMove.body._id);

      expect(parentDirectory1.subdirectories.length).toBe(1);
      expect(parentDirectory2.subdirectories.length).toBe(0);
      expect(directoryToMove.parentDirectory).toBe(
        parentDirectory1.directory._id
      );

      //// Moves directoryToMove from parent1 to parent2:
      await request(app).put("/api/directory/move").send({
        directoryId: directoryToMove.directory._id,
        newParentId: parentDirectory2.directory._id,
      });

      parentDirectory1 = await getDirectoryById(app, parentDirectory1.body._id);
      // parentDirectory2 = await getDirectoryById(app, parentDirectory2.body._id);
      // directoryToMove = await getDirectoryById(app, directoryToMove.body._id);
    });
  });

  // describe("PUT /api/directory/rename", () => {
  //   it("should rename a directory", async () => {
  //     const directoryToRename = await createTestDirectory(
  //       "Directory to Rename"
  //     );
  //     const newTitle = "Renamed Directory";

  //     const putResult = await request(app)
  //       .put("/api/directory/rename")
  //       .send({ directoryId: directoryToRename._id, newTitle });

  //     expect(putResult.status).toBe(200);
  //     expect(putResult.body.name).toBe(newTitle);

  //     // Clean up created directory
  //     await deleteDirectory(directoryToRename._id);
  //   });
  // });

  // describe("PUT /api/directory/switch-order", () => {
  //   it("should switch the order of quizzes and subdirectories", async () => {
  //     const directoryToSwitch = await createTestDirectory(
  //       "Directory to Switch"
  //     );
  //     const quiz1 = await createTestQuiz("Quiz 1", directoryToSwitch._id);
  //     const quiz2 = await createTestQuiz("Quiz 2", directoryToSwitch._id);
  //     const subdirectory1 = await createTestDirectory("Subdirectory 1");
  //     const subdirectory2 = await createTestDirectory("Subdirectory 2");

  //     const putResult = await request(app)
  //       .put("/api/directory/switch-order")
  //       .send({
  //         directoryId: directoryToSwitch._id,
  //         newQuizIdOrder: [quiz2._id, quiz1._id],
  //         newSubDirIdOrder: [subdirectory2._id, subdirectory1._id],
  //       });

  //     expect(putResult.status).toBe(200);

  //     // Clean up created directories and quizzes
  //     await deleteDirectory(directoryToSwitch._id);
  //     await deleteDirectory(subdirectory1._id);
  //     await deleteDirectory(subdirectory2._id);
  //     await deleteQuiz(quiz1._id);
  //     await deleteQuiz(quiz2._id);
  //   });
  // });

  // describe("DELETE /api/directory", () => {
  //   it("should delete a directory and its items", async () => {
  //     const directoryToDelete = await createTestDirectory(
  //       "Directory to Delete"
  //     );
  //     const quizToDelete = await createTestQuiz(
  //       "Quiz to Delete",
  //       directoryToDelete._id
  //     );
  //     const subdirectoryToDelete = await createTestDirectory(
  //       "Subdirectory to Delete"
  //     );

  //     const deleteResult = await request(app)
  //       .delete("/api/directory")
  //       .send({ directoryId: directoryToDelete._id });

  //     expect(deleteResult.status).toBe(200);
  //   });
  // });
});
