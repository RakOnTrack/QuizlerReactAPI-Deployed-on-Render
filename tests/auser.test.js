// Test calls for directory API calls

const request = require("supertest");
const express = require("express");
const db = require("./database.js");
/* const app = require("./quiz.test"); */
const user_routes = require("../routes/user.routes.js");
const directory_routes = require("../routes/directory.routes.js");
const quiz_routes = require("../routes/quiz.routes.js");
// const { createTestQuiz, updateQuiz } = require("./utils.js");
// Passport middleware
const session = require("express-session");
const passport = require("passport");

// Passport config
require("../config/passport")(passport);
jest.setTimeout(90000);
// app.use(express.urlencoded({ extended: false }));
// express session
const app = express();
app.use(express.json());
app.use("/api/users", user_routes);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  }),
);

let userCount = 0;
async function createNewUser(app) {
  const postResult = await request(app)
    .post("/api/users/register")
    .send({
      username: "testUser" + ++userCount, // Unique username
      password: "testPassword",
      password2: "testPassword",
    });

  return postResult;
}

async function loginTestUser(app) {
  const postResult = await request(app)
    .post("/api/users/login")
    .send({
      username: "testUser" + userCount,
      password: "testPassword",
    });

  //   console.log(postResult.body);
  getAuthenticatedAgent(app);

  return postResult;
}

async function fetchProfile(agent) {
  // const getResult = await request(app).get(`/api/users/dashboard`);
  return agent.get("/api/users/profile");
}

async function getAuthenticatedAgent(app, token) {
  // const token = loginResponse.body.token;

  // Create an agent and set the authorization header
  const agent = request.agent(app);
  agent.set("Authorization", `JWT ${token}`);

  return agent;
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

  describe("POST /api/register", () => {
    it("should create a new user", async () => {
      const postResult = await createNewUser(app);

      expect(postResult.status).toBe(200);
    });
  });

  describe("POST /api/login", () => {
    it("should login the newly created user", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);
    });
  });

  describe("Get /api/dashboard", () => {
    it("should login the newly created user and open dashboard page", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // add the loginUser.body.token to the header as authorization.
      const getDashboard = await authenticatedAgent.get("/api/users/profile");
      // .set("authorization", loginUser.body.token);
      // const getDashboard = await request(app).get("/api/users/dashboard");

      expect(getDashboard.status).toBe(200);
    });
  });

  describe("GET /api/users/profile", () => {
    it("should return the user's profile", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // this call should get the user's profile, including items in the rootDir.
      const getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      expect(getProfile.body.user.username).toBe("testUser" + userCount);
      expect(getProfile.body.directory._id).toBeDefined;
      // Add more assertions for the user's profile data

      // expect(getRootDirItems.status).toBe(200);
      // Add more assertions for the items in the rootDir
    });
  });

  describe("POST /api/users/quizzes", () => {
    it("should add a quiz to the user's rootDir", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Get the user's profile to verify the quiz is added to the rootDir

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Create a quiz object
      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };

      // Add the quiz to the user's rootDir
      const addQuiz = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);

      expect(addQuiz.status).toBe(200);
      expect(addQuiz.body.quizTitle).toBe(quiz.quizTitle);

      // get the updated profile
      const getProfile = await fetchProfile(authenticatedAgent);

      expect(getProfile.status).toBe(200);
      expect(getProfile.body.directory.quizzes.length).toBe(1);
      // Add more assertions for the quizzes in the rootDir
    });
  });

  describe("POST /api/users/subdirectories", () => {
    it("should add a subdirectory to the user's rootDir", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Create a subdirectory object
      const subdirectory = {
        name: "Test Subdirectory",
      };

      // Add the subdirectory to the user's rootDir
      const addSubdirectory = await authenticatedAgent
        .post("/api/users/addDirectory")
        .send(subdirectory);

      expect(addSubdirectory.status).toBe(200);
      expect(addSubdirectory.body.name).toBe(subdirectory.name);
      // Add more assertions for the added subdirectory

      // Get the user's profile to verify the subdirectory is added to the rootDir
      const getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      expect(getProfile.body.directory.subdirectories.length).toBe(1);
      // Add more assertions for the subdirectories in the rootDir
    });
  });

  describe("POST /api/users/subdirectories", () => {
    it("should add a subdirectory to the user's rootDir and add a quiz to that subdirectory", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Create a subdirectory object
      const subdirectory = {
        name: "Test Subdirectory",
      };

      // Add the subdirectory to the user's rootDir
      const addSubdirectory = await authenticatedAgent
        .post("/api/users/addDirectory")
        .send(subdirectory);

      expect(addSubdirectory.status).toBe(200);
      expect(addSubdirectory.body.name).toBe(subdirectory.name);

      // Get the user's profile to obtain the subdirectory ID
      const getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      const subDirID = getProfile.body.directory.subdirectories[0]._id;

      // Create a quiz object
      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
        directoryId: subDirID,
      };

      // Add the quiz to the subdirectory
      const addQuiz = await authenticatedAgent
        .post(`/api/users/addQuiz`)
        .send(quiz);

      expect(addQuiz.status).toBe(200);
      expect(addQuiz.body.quizTitle).toBe(quiz.quizTitle);

      const addSubdirectory2 = await authenticatedAgent
        .post("/api/users/addDirectory")
        .send({
          name: "Test Subdirectory2",
        }); //send the same subdirectory object

      expect(addSubdirectory2.status).toBe(200);
      // Get the user's profile again to verify the quiz is added to the subdirectory
      const getProfileAgain =
        await authenticatedAgent.get("/api/users/profile");

      expect(getProfileAgain.status).toBe(200);

      let subDir = getProfileAgain.body.directory.subdirectories[0];

      expect(subDir.numberOfQuizzes).toBe(1);
      expect(subDir.numberOfSubdirectories).toBe(0);

      // Create a subdirectory object

      // Add the subdirectory to the user's rootDir

      // expect(addSubdirectory2.body.name).toBe(subdirectory.name);
      // // Add more assertions for the added subdirectory

      // // Get the user's profile to verify the subdirectory is added to the rootDir
      // const getProfile2 = await authenticatedAgent.get("/api/users/profile");

      // expect(getProfile2.status).toBe(200);
    });
  });

  describe("POST /api/users/subdirectories/:subdirectoryId/quizzes/:quizId/move", () => {
    it("should move a quiz from the rootDir to a subdirectory", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Create a subdirectory object
      const subdirectory = {
        name: "Test Subdirectory",
      };

      // Add the subdirectory to the user's rootDir
      const addSubdirectory = await authenticatedAgent
        .post("/api/users/addDirectory")
        .send(subdirectory);

      expect(addSubdirectory.status).toBe(200);
      expect(addSubdirectory.body.name).toBe(subdirectory.name);
      // Add more assertions for the added subdirectory
      // Get the user's profile to obtain the subdirectory ID
      let getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      const subDirID = getProfile.body.directory.subdirectories[0]._id;

      // Create a quiz object
      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };

      // Add the quiz to the rootDir
      const addQuizToRootDir = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);

      // Add more assertions for the quizzes in the root directory
      expect(addQuizToRootDir.status).toBe(200);
      expect(addQuizToRootDir.body.quizTitle).toBe(quiz.quizTitle);
      // Add more assertions for the added quiz in the rootDir

      getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      expect(getProfile.body.directory.quizzes.length).toBe(1);
      // Move the quiz from the rootDir to the subdirectory
      // const moveQuiz = await authenticatedAgent
      //   .put(`/api/users/moveQuiz`)
      //   .send({
      //     quizId: getProfile.body.rootDir.quizzes[0]._id,
      //     destinationDirectoryId: subDirID,
      //   });

      const moveQuiz = await authenticatedAgent
        .put("/api/users/quizzes/moveQuiz")
        .send({
          quizId: getProfile.body.directory.quizzes[0]._id,
          newDirectoryId: subDirID,
        });

      expect(moveQuiz.status).toBe(200);
      // Add more assertions for the moved quiz

      // Get the user's profile to verify the quiz is moved to the subdirectory
      getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      expect(getProfile.body.directory.quizzes.length).toBe(0);
      expect(getProfile.body.directory.subdirectories[0].numberOfQuizzes).toBe(
        1,
      );
      // Add more assertions for the quizzes in the subdirectory
    });
  });

  describe("GET /api/users/quizzes", () => {
    it("should read a quiz from the user route", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };

      // Add the quiz to the rootDir
      const makeQuiz = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);
      expect(makeQuiz.status).toBe(200);

      let getProfile = await authenticatedAgent.get("/api/users/profile");

      const readQuiz = await authenticatedAgent
        .get("/api/users/quizzes/" + getProfile.body.directory.quizzes[0]._id)
        .send({});
      expect(readQuiz.status).toBe(200);

      expect(readQuiz.body.quizTitle).toBe(quiz.quizTitle);
      expect(readQuiz.body.questions.length).toBe(2);
    });
  });

  describe("GET /api/users/quizzes", () => {
    it("should read a quiz from the user route", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };

      // Add the quiz to the rootDir
      const makeQuiz = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);
      expect(makeQuiz.status).toBe(200);

      let getProfile = await authenticatedAgent.get("/api/users/profile");
      const renameQuiz = await authenticatedAgent
        .put(
          "/api/users/quizzes/rename/" +
            getProfile.body.directory.quizzes[0]._id,
        )
        .send({
          // quizId: getProfile.body.directory.quizzes[0]._id,
          quizTitle: "new title",
        });

      expect(renameQuiz.status).toBe(200);
      expect(renameQuiz.body.quizTitle).toBe("new title");
    });
  });

  // 12 read directory( for subdirectory, root already works.)
  describe("GET /api/directories/:id", () => {
    it("should retrieve the specified directory and its contents", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);

      expect(loginUser.status).toBe(200);

      // Create an agent and set the authorization header
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      const subdirectory = {
        name: "Test Subdirectory",
      };

      // Add the subdirectory to the user's rootDir
      const addSubdirectory = await authenticatedAgent
        .post("/api/users/addDirectory")
        .send(subdirectory);

      expect(addSubdirectory.status).toBe(200);
      expect(addSubdirectory.body.name).toBe(subdirectory.name);

      // use the subdirectory ID to get the subdirectory

      const getProfile = await authenticatedAgent.get("/api/users/profile");
      expect(getProfile.body.directory.subdirectories.length).toBe(1);
      expect(getProfile.body.directory.subdirectories[0]._id).toBe(
        addSubdirectory.body._id,
      );
      const readSubdirectory = await authenticatedAgent
        .get("/api/users/directory")
        .send({ id: getProfile.body.directory.subdirectories[0]._id });

      expect(readSubdirectory.status).toBe(200);
      expect(readSubdirectory.body.name).toBe(subdirectory.name);
      expect(readSubdirectory.body.quizzes.length).toBe(0);
      expect(readSubdirectory.body.subdirectories.length).toBe(0);
      expect(readSubdirectory.body.parentDirectory).toBe(
        getProfile.body.user.rootDir,
      );
    });
  });

  // // 3 adding a new question to a quiz
  describe("PUT /api/users/quizzes/:quizId/questions/add", () => {
    it("should add a new question to the specified quiz", async () => {
      // Create user and login to get token
      const createUser = await createNewUser(app);
      expect(createUser.status).toBe(200);
      const loginUser = await loginTestUser(app);
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Create a quiz
      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };
      const createQuizResponse = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);
      const quizId = createQuizResponse.body._id;

      // Define the new question data
      const newQuestion = {
        questionTitle: "Question 3",
        incorrect_answers: ["Option 1", "Option 2", "Option 3"],
        correct_answer: 1,
      };

      // Send request to add a new question to the quiz
      const response = await authenticatedAgent
        .put(`/api/users/quizzes/${quizId}/questions/add`)
        .send(newQuestion);

      // Assert the expected result
      expect(response.status).toBe(200);
      expect(response.body.questions.length).toBe(3);
      expect(response.body.questions[2].questionTitle).toBe(
        newQuestion.questionTitle,
      );

      // Additional assertions...
    });
  });

  // // 4 save study mode results, and restarting quiz
  describe("PUT /api/users/quizzes/:quizId/restart", () => {
    it("should save study mode results and allow restarting the quiz", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Assuming a quiz has been attempted and its ID is known
      // Create a quiz
      const quiz = {
        quizTitle: "Save Study Mode Results Test",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };
      const createQuizResponse = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);
      const quizId = createQuizResponse.body._id;

      //get profile
      const getQuiz = await authenticatedAgent.get(
        "/api/users/quizzes/" + quizId,
      );
      expect(getQuiz.status).toBe(200);
      const question1id = getQuiz.body.questions[0]._id;

      //mark question 1 as correct
      const markQuestionCorrect = await authenticatedAgent
        .put("/api/users/quizzes/" + quizId + "/markCorrect")
        .send({ correctQuestions: [question1id] });

      expect(markQuestionCorrect.status).toBe(200);

      const getProfile2nd = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile2nd.status).toBe(200);
      expect(
        getProfile2nd.body.directory.quizzes[0].numberOfCorrectQuestions,
      ).toBe(1);
      const restartResponse = await authenticatedAgent.put(
        `/api/users/quizzes/${quizId}/restart`,
      );
      expect(restartResponse.status).toBe(200);

      const getProfile3rd = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile3rd.status).toBe(200);
      expect(
        getProfile3rd.body.directory.quizzes[0].numberOfCorrectQuestions,
      ).toBe(0);
      // Further assertions based on your restart logic
    });
  });

  // // // 5 delete a quiz
  describe("DELETE /api/users/quizzes/:id", () => {
    it("should delete the specified quiz", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );

      // Assuming a quiz has been created already and its ID is known
      const quiz = {
        quizTitle: "Save Study Mode Results Test",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };

      // Add the quiz to the rootDir
      const makeQuiz = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);
      expect(makeQuiz.status).toBe(200);
      const getProfile = await authenticatedAgent.get("/api/users/profile");
      expect(getProfile.status).toBe(200);
      expect(getProfile.body.directory.quizzes.length).toBe(1);

      const quizID = makeQuiz.body._id;
      const deleteResponse = await authenticatedAgent.delete(
        `/api/users/quizzes/${quizID}`,
      );
      expect(deleteResponse.status).toBe(200);
      // Further assertions to confirm deletion
      const deleteResponse2 = await authenticatedAgent.delete(
        `/api/users/quizzes/${quizID}`,
      );
      expect(deleteResponse2.status).toBe(422);
      // check that there are no quizzes in the rootDir
      const getProfile2nd = await authenticatedAgent.get("/api/users/profile");
      expect(getProfile2nd.status).toBe(200);
      expect(getProfile2nd.body.directory.quizzes.length).toBe(0);
    });
  });

  // // // 6 changing contents of a question
  describe("PUT /api/users/quizzes/:id", () => {
    it("should update the contents of a question in a quiz", async () => {
      const createUser = await createNewUser(app);

      expect(createUser.status).toBe(200);

      const loginUser = await loginTestUser(app);
      const authenticatedAgent = await getAuthenticatedAgent(
        app,
        loginUser.body.token,
      );
      const quiz = {
        quizTitle: "Save Study Mode Results Test",
        questions: [
          {
            questionTitle: "Question 1",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 0,
          },
          {
            questionTitle: "Question 2",
            incorrect_answers: ["Option 1", "Option 2", "Option 3"],
            correct_answer: 1,
          },
        ],
      };
      // Add the quiz to the rootDir
      const makeQuiz = await authenticatedAgent
        .post("/api/users/addQuiz")
        .send(quiz);
      expect(makeQuiz.status).toBe(200);
      const quizID = makeQuiz.body._id;
      // Assuming a quiz with a specific question is known
      // const quizId = "your_quiz_id";
      const questionId = makeQuiz.body.questions[0]._id;
      const updatedQuestion = {
        questionTitle: "Updated Question",
        incorrect_answers: ["Option 1", "Option 2", "Option 3"],
        correct_answer: 1,
      };

      const updateResponse = await authenticatedAgent
        .put(`/api/users/quizzes/${quizID}/questions/${questionId}`)
        .send(updatedQuestion);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.questionTitle).toBe(
        updatedQuestion.questionTitle,
      );
      // Additional assertions for updated question
    });
  });

  // // // 7 deleting a question
  // describe("DELETE /api/users/quizzes/questions/:questionId", () => {
  //   it("should delete a specific question from a quiz", async () => {
  // const createUser = await createNewUser(app);
  // expect(createUser.status).toBe(200);
  //     const loginUser = await loginTestUser(app);
  //     const authenticatedAgent = await getAuthenticatedAgent(
  //       app,
  //       loginUser.body.token
  //     );
  // const quiz = {
  //   quizTitle: "Save Study Mode Results Test",
  //   questions: [
  //     {
  //       questionTitle: "Question 1",
  //       incorrect_answers: ["Option 1", "Option 2", "Option 3"],
  //       correct_answer: 0,
  //     },
  //     {
  //       questionTitle: "Question 2",
  //       incorrect_answers: ["Option 1", "Option 2", "Option 3"],
  //       correct_answer: 1,
  //     },
  //   ],
  // };
  // Add the quiz to the rootDir
  //  const makeQuiz = await authenticatedAgent
  //  .post("/api/users/addQuiz")
  //  .send(quiz);
  // expect(makeQuiz.status).toBe(200);
  //const quizID = makeQuiz.body._id;

  //     const deleteResponse = await authenticatedAgent.delete(
  //       `/api/users/quizzes/questions/${questionId}`
  //     );
  //     expect(deleteResponse.status).toBe(200);
  //     // Additional assertions to confirm question deletion
  //   });
  // });

  // // // 8 move directory
  // describe("PUT /api/users/directory/:directoryId/move", () => {
  //   it("should move a directory to a new location", async () => {
  // const createUser = await createNewUser(app);

  // expect(createUser.status).toBe(200);

  //     const loginUser = await loginTestUser(app);
  //     const authenticatedAgent = await getAuthenticatedAgent(
  //       app,
  //       loginUser.body.token
  //     );

  //     // Assuming directory IDs are known
  //     const directoryId = "your_directory_id";
  //     const newParentId = "new_parent_directory_id";

  //     const moveResponse = await authenticatedAgent
  //       .put(`/api/users/directory/${directoryId}/move`)
  //       .send({ newParentId });
  //     expect(moveResponse.status).toBe(200);
  //     // Additional assertions for directory movement
  //   });
  // });

  // // // 9 rename a directory (root invalid)
  // describe("PUT /api/users/directory/:directoryId/rename", () => {
  //   it("should rename a specified directory", async () => {
  // const createUser = await createNewUser(app);

  // expect(createUser.status).toBe(200);

  //     const loginUser = await loginTestUser(app);
  //     const authenticatedAgent = await getAuthenticatedAgent(
  //       app,
  //       loginUser.body.token
  //     );

  //     const directoryId = "your_directory_id";
  //     const newName = "New Directory Name";

  //     const renameResponse = await authenticatedAgent
  //       .put(`/api/users/directory/${directoryId}/rename`)
  //       .send({ newTitle: newName });
  //     expect(renameResponse.status).toBe(200);
  //     // Additional assertions for renamed directory
  //   });
  // });

  // // // 10 switch order of subdirectories and quizzes
  // describe("PUT /api/users/directory/:directoryId/switchOrder", () => {
  //   it("should change the order of subdirectories and quizzes within a directory", async () => {
  // const createUser = await createNewUser(app);

  // expect(createUser.status).toBe(200);

  //     const loginUser = await loginTestUser(app);
  //     const authenticatedAgent = await getAuthenticatedAgent(
  //       app,
  //       loginUser.body.token
  //     );
  // const quiz = {
  //   quizTitle: "Save Study Mode Results Test",
  //   questions: [
  //     {
  //       questionTitle: "Question 1",
  //       incorrect_answers: ["Option 1", "Option 2", "Option 3"],
  //       correct_answer: 0,
  //     },
  //     {
  //       questionTitle: "Question 2",
  //       incorrect_answers: ["Option 1", "Option 2", "Option 3"],
  //       correct_answer: 1,
  //     },
  //   ],
  // };
  // Add the quiz to the rootDir
  //  const makeQuiz = await authenticatedAgent
  //  .post("/api/users/addQuiz")
  //  .send(quiz);
  // expect(makeQuiz.status).toBe(200);
  //const quizID = makeQuiz.body._id;

  //     const directoryId = "your_directory_id";
  //     const newOrder = {
  //       /* new order data */
  //     };

  //     const switchOrderResponse = await authenticatedAgent
  //       .put(`/api/users/directory/${directoryId}/switchOrder`)
  //       .send(newOrder);
  //     expect(switchOrderResponse.status).toBe(200);
  //     // Additional assertions for order change
  //   });
  // });

  // // // 11 delete directory (only sub directory, root is invalid) and check if the quizzes are deleted
  // describe("DELETE /api/users/directory/:directoryId", () => {
  //   it("should delete a specified subdirectory", async () => {
  // const createUser = await createNewUser(app);

  // expect(createUser.status).toBe(200);

  //     const loginUser = await loginTestUser(app);
  //     const authenticatedAgent = await getAuthenticatedAgent(
  //       app,
  //       loginUser.body.token
  //     );
  // const quiz = {
  //   quizTitle: "Save Study Mode Results Test",
  //   questions: [
  //     {
  //       questionTitle: "Question 1",
  //       incorrect_answers: ["Option 1", "Option 2", "Option 3"],
  //       correct_answer: 0,
  //     },
  //     {
  //       questionTitle: "Question 2",
  //       incorrect_answers: ["Option 1", "Option 2", "Option 3"],
  //       correct_answer: 1,
  //     },
  //   ],
  // };
  // Add the quiz to the rootDir
  //  const makeQuiz = await authenticatedAgent
  //  .post("/api/users/addQuiz")
  //  .send(quiz);
  // expect(makeQuiz.status).toBe(200);
  //const quizID = makeQuiz.body._id;

  //     const directoryId = "your_subdirectory_id";

  //     const deleteResponse = await authenticatedAgent.delete(
  //       `/api/users/directory/${directoryId}`
  //     );
  //     expect(deleteResponse.status).toBe(200);
  //     // Additional assertions to confirm subdirectory deletion
  //   });
  // });
});
