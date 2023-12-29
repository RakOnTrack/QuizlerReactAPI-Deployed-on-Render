const express = require("express");
const router = express.Router();
const fs = require("fs"); // File system module
const { ensureAuthenticated } = require("../config/auth");
const jwt = require("jsonwebtoken");
const userService = require("../controllers/user.controller.js");
const passport = require("passport");
// const User = require("../models/user.model.js");

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

    // req.flash("success_msg", "You are logged out");
    res.redirect("/login");
  });
});

// router.get("/dashboard", ensureAuthenticated, (req, res) =>
//   res.render("dashboard", {
//     name: req.user.userName,
//   })
// );

// Other user routes...

module.exports = router;
