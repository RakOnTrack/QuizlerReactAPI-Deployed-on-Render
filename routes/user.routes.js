const express = require("express");
const router = express.Router();
const fs = require("fs"); // File system module
// const { ensureAuthenticated } = require("../config/auth");
const jwt = require("jsonwebtoken");
const userService = require("../controllers/user.controller.js");
const passport = require("passport");
// const User = require("../models/user.model.js");
const directoryController = require("../controllers/directory.controller.js");
const quizController = require("../controllers/quiz.controller.js");
const db = require("../models/index"); // retrieve mongo connection

let User = db.mongoose.connection.model(
  "User",
  require("../models/user.model")
);
// Define your routes here

// home route
router.get("/", (req, res) => res.send("User route"));

// Create a new user
router.post("/register", userService.createUser);

// Login route
router.post("/login", userService.loginUser);

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

// Route to identify the user
// Dashboard Route
router.get("/dashboard", verifyToken, (req, res) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }
  res.send(`Hello ${req.user.userName}`);
});

// Logout Handle
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/"); // Handle error by redirecting to a different page
    }

    res.redirect("/login");
  });
});

// profile
router.get("/profile", verifyToken, userService.getUserProfile);
router.delete("/delete", verifyToken, userService.deleteUserAccount);

// quizzes
// Route to add a new quiz to the user's root directory
router.post("/addQuiz", verifyToken, (req, res) => {
  // Set the directoryId to the user's rootDir before calling addQuiz
  req.body.directoryId = req.body.directoryId || req.user.rootDir._id;
  quizController.addQuiz(req, res);
});

// Route to add a directory to the user's root directory
router.post("/addDirectory", verifyToken, (req, res) => {
  // Set the parentId to the user's rootDir before calling addDirectory
  req.body.parentDirectoryId = req.user.rootDir._id || req.body.parentId;
  directoryController.createDirectory(req, res);
});

// Route to read the user's root directory
router.get("/readDirectory", verifyToken, (req, res) => {
  // Set req.params.id to be the user's rootDir
  req.params.id = req.user.rootDir;
  directoryController.readDirectory(req, res);
});
router.put("/quiz/:quizId/update", verifyToken, userService.updateQuiz);
router.get("/quiz/:quizId", verifyToken, userService.getQuizDetails);

// directories
router.put(
  "/directory/:directoryId/update",
  verifyToken,
  userService.updateDirectory
);
router.delete(
  "/directory/:directoryId/delete",
  verifyToken,
  userService.deleteDirectory
);
router.get(
  "/directory/:directoryId/subdirectories",
  verifyToken,
  userService.listSubdirectories
);

// Route to move a quiz from one directory to another
router.put("/moveQuiz", verifyToken, (req, res) => {
  // const {  } = req.body.quizId;
  const { quizId, newDirectoryId } = req.body;

  // Move the quiz to the destination directory
  directoryController
    .moveQuiz(req, res)
    .then(() => {
      return;
      // res.status(200).json({ message: "Quiz moved successfully" });
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to move quiz: " + error });
    });
});

// Other user routes...

module.exports = router;
