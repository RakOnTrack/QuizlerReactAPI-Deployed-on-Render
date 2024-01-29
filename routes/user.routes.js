const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
// const fs = require("fs"); // File system module
const userService = require("../controllers/user.controller.js");
const directoryController = require("../controllers/directory.controller.js");
const quizController = require("../controllers/quiz.controller.js");
const db = require("../models/index"); // retrieve mongo connection

let User = db.mongoose.connection.model(
  "User",
  require("../models/user.model")
);

// Middleware to verify token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("No token provided");
  }

  const token = authHeader.split(" ")[1]; // Assuming the header format is "Bearer [token]"
  if (!token) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  try {
    const decoded = jwt.verify(token, "your_secret_key"); // Ensure this key matches the one used in /login
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).send("Unauthorized: Invalid token");
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send("Unauthorized: Invalid token: " + error);
  }
};

// Define your routes here

// Home route
router.get("/", (req, res) => res.send("User route"));

// Authentication Routes
router.post("/register", userService.createUser);
router.post("/login", userService.loginUser);
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/"); // Handle error by redirecting to a different page
    }

    res.redirect("/login");
  });
});
router.get("/profile", verifyToken, userService.getUserProfile);
router.delete("/delete", verifyToken, userService.deleteUserAccount);

// Quiz Routes
router.post("/addQuiz", verifyToken, (req, res) => {
  // Set the directoryId to the user's rootDir before calling addQuiz
  req.body.directoryId = req.body.directoryId || req.user.rootDir._id;
  quizController.addQuiz(req, res);
});
router.put("/quizzes/rename/:id", verifyToken, quizController.renameItem);
router.get("/quizzes/:id", verifyToken, quizController.getQuiz);
router.put("/quizzes/moveQuiz", verifyToken, (req, res) => {
  directoryController
    .moveQuiz(req, res)
    .then(() => {
      return;
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to move quiz: " + error });
    });
});
router.put(
  "/quizzes/:id/questions/add",
  verifyToken,
  quizController.addQuestion
);
router.put(
  "/quizzes/:id/markCorrect",
  verifyToken,
  quizController.markQuestionsCorrect
);
router.put("/quizzes/:id/restart", verifyToken, quizController.restartQuiz);
router.delete("/quizzes/:id", verifyToken, quizController.deleteQuiz);
router.put(
  "/quizzes/:id/questions/:questionId",
  verifyToken,
  quizController.updateQuestion
);

// Directory Routes
router.post("/addDirectory", verifyToken, (req, res) => {
  req.body.parentDirectoryId = req.user.rootDir._id || req.body.parentId;
  directoryController.createDirectory(req, res);
});
router.get("/directory", verifyToken, (req, res) => {
  req.params.id = req.body.id || req.user.rootDir;
  directoryController
    .readDirectory(req, res)
    .then((directory) => res.json(directory));
});
router.get("/directory/:directoryId", verifyToken, (req, res) => {
  directoryController // i might want to use this instead of using req.body.id.
    .readDirectory(req, res)
    .then((directory) => res.json(directory));
});
router.put(
  "/directory/:directoryId/move",
  verifyToken,
  directoryController.moveDirectory
);
router.put(
  "/directory/:directoryId/rename",
  verifyToken,
  directoryController.renameDirectory
);
router.put(
  "/directory/:directoryId/switchOrder",
  verifyToken,
  directoryController.switchOrder
);
router.delete(
  "/directory/:directoryId",
  verifyToken,
  directoryController.deleteDirectory
);

module.exports = router;
