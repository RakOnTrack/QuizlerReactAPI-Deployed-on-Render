const request = require("supertest");
const app = require("express")();

async function createTestDirectory(app, name, parentDirectoryId = null) {
  const postResult = await request(app).post("/api/directory").send({
    name: name,
    parentDirectoryId: parentDirectoryId,
  });
  return postResult;
}

async function createTestQuiz(app, name, parentDirectoryId = null) {
  const postResult = await request(app)
    .post("/api/quizzes")
    .send({
      quizTitle: name,
      questions: [
        {
          questionTitle: "Test Question Title 1",
          correct_answer: "Correct",
          incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
        },
        {
          questionTitle: "Test Question Title 2",
          correct_answer: "Correct",
          incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
        },
      ],
      directoryId: parentDirectoryId,
    });

  return postResult;
}

async function updateDir(app, dir) {
  const getResult = await request(app).get(`/api/directory/${dir.body._id}`);
  return getResult;
}

async function updateQuiz(app, quiz) {
  const getResult = await request(app).get(`/api/quizzes/${quiz.body._id}`);
  return getResult;
}

//  // Create a quiz object
//  const quiz = {
//   title: "My Quiz",
//   questions: [
//     {
//       question: "Question 1",
//       options: ["Option 1", "Option 2", "Option 3"],
//       answer: 0,
//     },
//     {
//       question: "Question 2",
//       options: ["Option 1", "Option 2", "Option 3"],
//       answer: 1,
//     },
//   ],
// };
module.exports = {
  createTestDirectory,
  createTestQuiz,
  updateDir,
  updateQuiz,
};
