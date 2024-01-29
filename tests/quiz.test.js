// // Test calls for quiz API calls
// const request = require("supertest");
// const express = require("express");
// const db = require("./database");
// const quiz_routes = require("../routes/quiz.routes.js");
// const { createTestQuiz, updateQuiz } = require("./utils.js");
// const app = express();

// // Middleware for parsing JSON request bodies
// app.use(express.json());

// app.use("/api/quizzes", quiz_routes);

// //const agent = request.agent(app);

// //afterEach(async () => await db.clear());

// jest.setTimeout(90000);





// describe("Quiz API Tests", () => {
//   // Connects to the test database before all the tests in this suite
//   beforeAll(async () => {
//     await db.connect();
//   });

//   // Disconnects to the test database after all the tests in this suite
//   afterAll(async () => {
//     await db.close();
//   });

//   /** Test Case 1:
//    * Adds a quiz to database with a test directory
//    */
//   describe("POST /api/quizzes", () => {
//     it("should add a quiz to the database", async () => {
//       let testQuizTitle = "Test Quiz Title";

//       const testQuiz = await createTestQuiz(app, testQuizTitle);

//       expect(testQuiz.status).toBe(200);
//       expect(testQuiz.body.quizTitle === testQuizTitle);
//     });
//   });

//   /** Test Case 2:
//    * Adds a quiz to database with a test directory
//    */
//   describe("POST /api/quizzes", () => {
//     it("should add a quiz to the database with no directory", async () => {
//       let testQuizTitle = "Test Quiz Title";
//       const testQuiz = await createTestQuiz(app, testQuizTitle);
//       // this is actual bull shit. i'm not able to work with  the root directory since these tests are using fake data.
//       // but i should be able to make regular javascript files with hard coded values that i can run as tests while the server is live, to check if they're working once in a while.
//       // also we're not going to use the default root directory in the final version anyways, so maybe i shouldnt try to keep it.

//       expect(testQuiz.status).toBe(200);
//       expect(testQuiz.quizTitle === testQuizTitle);
//     });
//   });

//   /** Test Case 3:
//    * Adds multiple quizzes to database with a test directory
//    */
//   describe("POST /api/quizzes", () => {
//     it("should add multiple quizzes to the database with test directory", async () => {
//       let testQuizTitle = "Test Quiz Title";
//       const res1 = await createTestQuiz(app, testQuizTitle + "1");
//       const res2 = await createTestQuiz(app, testQuizTitle + "2");
//       const res3 = await createTestQuiz(app, testQuizTitle + "3");

//       expect(res1.status).toBe(200);
//       expect(res2.status).toBe(200);
//       expect(res3.status).toBe(200);
//     });
//   });

//   /** Test Case 4:
//    * Retrieves all the quizzez in the database
//    */
//   describe("GET /api/quizzes", () => {
//     it("should get all the quizzes in the database", async () => {
//       const res1 = await request(app).get("/api/quizzes");
//       expect(res1.status).toBe(200);
//       const quiz = await createTestQuiz(app, "Test Quiz Title");
//       const quiz2 = await createTestQuiz(app, "Test Quiz Title2");
//       const quiz3 = await createTestQuiz(app, "Test Quiz Title3");
//       const quiz4 = await createTestQuiz(app, "Test Quiz Title4");
//       const quiz5 = await createTestQuiz(app, "Test Quiz Title5");

//       const res2 = await request(app).get("/api/quizzes");

//       // quizToMove = await updateQuiz(app, );
//       expect(res2.status).toBe(200);
//       expect(res2.body.length - res1.body.length).toBe(5);

//       // WHAT THE FUCK! ITS NOT RESETING THE DATABASE TO EMPTY!
//     });
//   });

//   /** Test Case 5:
//    * Adds a quiz and retrieves it from the database using its ID
//    */
//   describe("GET /api/quizzes/:id", () => {
//     it("should get the quiz from the database by its ID", async () => {
//       const quiz = await createTestQuiz(app, "Test Quiz Title");

//       expect(quiz.status).toBe(200);
//       let id = quiz.body._id;

//       const getResult = await updateQuiz(app, quiz);
//       expect(getResult.status).toBe(200);
//     });
//   });

//   /** Test Case 6:
//    * Retrieves a quiz that has an invalid ID
//    */
//   describe("GET /api/quizzes/:id", () => {
//     it("should get error when trying to find an invalid ID", async () => {
//       // random string of integers to represent an ID
//       let id = Math.floor(100000000 + Math.random() * 900000000).toString();

//       const getResult = await request(app).get(`/api/quizzes/${id}`);
//       expect(getResult.status).toBe(500);
//     });
//   });

//   /** Test Case 7:
//    * Add a quiz and rename its quiz title using its ID
//    */
//   describe("PUT /api/quizzes/rename/:id", () => {
//     it("should rename a quiz title in the database using its ID", async () => {
//       const origName = "Test Quiz Original Title";
//       const newName = "Test Quiz New Title";

//       const quiz = await createTestQuiz(app, origName);

//       expect(quiz.status).toBe(200);
//       let id = quiz.body._id;

//       const putResult = await request(app)
//         .put(`/api/quizzes/rename/${id}`)
//         .send({
//           quizTitle: newName,
//         });
//       expect(putResult.status).toBe(200);
//       expect(putResult.body.quizTitle).toBe(newName);
//     });
//   });

//   /** Test Case 8:
//    * Add a quiz and add a question to it
//    */
//   describe("PUT /api/quizzes/question/:id", () => {
//     it("should add a question to a quiz using its ID", async () => {
//       const testQuiz = await createTestQuiz(app, "Test Quiz Title");
//       let id = testQuiz.body._id;

//       expect(testQuiz.status).toBe(200);

//       const putResult = await request(app)
//         .put(`/api/quizzes/question/${id}`)
//         .send({
//           questionTitle: "Added Test Question Title",
//           correct_answer: "Correct",
//           incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
//         });
//       expect(putResult.status).toBe(200);
//       expect(putResult.body.quizTitle).toBe("Test Quiz Title");
//       expect(putResult.body.questions).toHaveLength(3);
//     });
//   });

//   /** Test Case 9:
//    * Update study results for quiz
//    */
//   describe("PUT /api/quizzes/update/:id", () => {
//     it("should update the study results for the quiz", async () => {
//       let testQuiz = await createTestQuiz(app, "Test Quiz Title");

//       expect(testQuiz.status).toBe(200);
//       let id = testQuiz.body._id;

//       const putResult = await request(app)
//         .put(`/api/quizzes/markCorrectAnswers/${id}`)
//         .send({
//           correctQuestions: [testQuiz.body.questions[0]._id],
//         });
//       expect(putResult.status).toBe(200);

//       let getResult = await updateQuiz(app, testQuiz);

//       expect(getResult.status).toBe(200);
//       expect(getResult.body.questions[0].isCorrect).toBe(true);
//       expect(getResult.body.questions[1].isCorrect).toBe(false);

//       // Check if questions have been marked as correct
//       getResult = await updateQuiz(app, testQuiz);

//       expect(getResult.status).toBe(200);

//       // expect(getResult.body.questions[0].isCorrect).toBe(false);
//       // expect(getResult.body.questions[1].isCorrect).toBe(false);
//     });
//   });

//   /** Test Case 10:
//    * Restart the quiz progress by marking all questions as false for correct using its ID to find it
//    */
//   describe("PUT /api/quizzes/restart/:id", () => {
//     it("should restart the progress of the quiz", async () => {
//       let testQuizTitle = "Test Quiz Title";
//       const testQuiz = await createTestQuiz(app, testQuizTitle);

//       expect(testQuiz.status).toBe(200);
//       let id = testQuiz.body._id;

//       expect(testQuiz.body.questions[0].isCorrect).toBe(false);
//       // Mark questions as correct
//       const markCorrectResult = await request(app)
//         .put(`/api/quizzes/markCorrectAnswers/${id}`)
//         .send({
//           correctQuestions: [testQuiz.body.questions[0]._id],
//         });

//       // Get updated results to check if questions have been marked as correct
//       const getResult = await updateQuiz(app, testQuiz);
//       expect(getResult.status).toBe(200);

//       expect(getResult.status).toBe(200);
//       expect(getResult.body.questions[0].isCorrect).toBe(true);
//       expect(getResult.body.questions[1].isCorrect).toBe(false);

//       const putResult = await request(app).put(`/api/quizzes/restart/${id}`);
//       expect(putResult.status).toBe(200);

//       // Now you can add assertions to check if the questions have been marked as incorrect after restarting the quiz
//       const updatedQuiz = await updateQuiz(app, testQuiz);

//       expect(updatedQuiz.status).toBe(200);
//       expect(updatedQuiz.body.questions).toHaveLength(2);

//       expect(updatedQuiz.body.questions[0].isCorrect).toBe(false);
//       expect(updatedQuiz.body.questions[1].isCorrect).toBe(false);
//     });
//   });

//   /** Test Case 11:
//    * Remove a quiz by its ID
//    */
//   describe("DELETE /api/quizzes/:id", () => {
//     it("should remove a quiz by its ID", async () => {
//       const testQuiz = await createTestQuiz(app, "Test Quiz Title");

//       expect(testQuiz.status).toBe(200);
//       let id = testQuiz.body._id;

//       // check that it actually exists
//       let getResult = await updateQuiz(app, testQuiz);
//       expect(getResult.status).toBe(200);

//       // delete the quiz
//       const deleteResult = await request(app).delete(`/api/quizzes/${id}`);
//       expect(deleteResult.status).toBe(200);

//       // try to get the quiz to see that it doesnt work:
//       getResult = await updateQuiz(app, testQuiz);
//       expect(getResult.status).toBe(404);

//       //console.log(deleteResult.body.length);
//       //expect(deleteResult.body.length).not.toBe(quizNumber);
//     });
//   });

//   /** Test Case 12:
//    * Update the question and its contents using the question ID
//    */
//   describe("PUT /api/quizzes/questions/:questionId", () => {
//     it("should update the question using its ID", async () => {
//       const testQuiz = await createTestQuiz(app, "Test Quiz Title");

//       expect(testQuiz.status).toBe(200);

//       let q1_id = testQuiz.body.questions[0]._id;
//       const newQTitle = "CHANGED Test Question Title 1";
//       const newQCorrectAnswer = "Correct2";
//       const putResult = await request(app)
//         .put(`/api/quizzes/questions/${q1_id}`)
//         .send({
//           questionTitle: newQTitle,
//           correct_answer: "Correct2",
//           incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
//         });

//       expect(putResult.status).toBe(200);
//       expect(putResult.body.questionTitle).toBe(newQTitle);
//       expect(putResult.body.correct_answer).toBe(newQCorrectAnswer);
//     });
//   });

//   /** Test Case 13:
//    * Delete the question using its ID
//    */
//   describe("DELETE /api/quizzes/questions/:questionId", () => {
//     it("should remove the question using its ID", async () => {
//       const testQuiz = await createTestQuiz(app, "Test Quiz Title");

//       expect(testQuiz.status).toBe(200);
//       // check its question length:
//       expect(testQuiz.body.questions.length).toBe(2);

//       // let q1_id = testQuiz.body.questions[0]._id;

//       const deleteResult = await request(app).delete(
//         `/api/quizzes/questions/${testQuiz.body.questions[0]._id}`
//       );
//       expect(deleteResult.status).toBe(200);

//       const updatedQuiz = await request(app).get(
//         `/api/quizzes/${testQuiz.body._id}`
//       );
//       expect(updatedQuiz.body.questions.length).toBe(1);
//     });
//   });

//   /** Test Case 14:
//    * Get a quiz by searching by its quizTitle query
//    */
//   // i dont think we have a route like this.
//   // describe("GET /api/quizzes?quizTitle=", () => {
//   //   it("should retrieve related quizzes to the quizTitle query", async () => {
//   //     let testQuizTitle = "Searchable Test Quiz Title";
//   //     const quiz2 = await createTestQuiz(testQuizTitle);

//   //     expect(quiz2.status).toBe(200);

//   //     const getResult = await request(app).get(
//   //       `/api/quizzes?quizTitle="${testQuizTitle}"`
//   //     );
//   //     expect(getResult.status).toBe(200);
//   //     expect(getResult.body.length).toBe(1);
//   //   });
//   // });
// });
