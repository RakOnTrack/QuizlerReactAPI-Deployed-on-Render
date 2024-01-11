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
  })
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
        loginUser.body.token
      );

      // add the loginUser.body.token to the header as authorization.
      const getDashboard = await authenticatedAgent.get("/api/users/dashboard");
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
        loginUser.body.token
      );

      // this call should get the user's profile, including items in the rootDir.
      const getProfile = await authenticatedAgent.get("/api/users/profile");

      expect(getProfile.status).toBe(200);
      expect(getProfile.body.user.userName).toBe("testUser" + userCount);
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
        loginUser.body.token
      );

      // Create a quiz object
      const quiz = {
        quizTitle: "My Quiz",
        questions: [
          {
            question: "Question 1",
            options: ["Option 1", "Option 2", "Option 3"],
            answer: 0,
          },
          {
            question: "Question 2",
            options: ["Option 1", "Option 2", "Option 3"],
            answer: 1,
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
        loginUser.body.token
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
        loginUser.body.token
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
            question: "Question 1",
            options: ["Option 1", "Option 2", "Option 3"],
            answer: 0,
          },
          {
            question: "Question 2",
            options: ["Option 1", "Option 2", "Option 3"],
            answer: 1,
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
        loginUser.body.token
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
            question: "Question 1",
            options: ["Option 1", "Option 2", "Option 3"],
            answer: 0,
          },
          {
            question: "Question 2",
            options: ["Option 1", "Option 2", "Option 3"],
            answer: 1,
          },
        ],
        // directoryId: subDirID,
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
        .put("/api/users/moveQuiz")
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
        1
      );
      // Add more assertions for the quizzes in the subdirectory
    });
  });
});
