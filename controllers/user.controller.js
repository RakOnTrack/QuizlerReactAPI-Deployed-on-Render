const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const directoryService = require("../controllers/directory.controller.js");

const passport = require("passport");
const passportJWT = require("passport-jwt");
const db = require("../models/index"); // retrieve mongo connection
const directoryController = require("./directory.controller.js");
const quizController = require("./quiz.controller.js");
let User = db.mongoose.connection.model(
  "User",
  require("../models/user.model"),
);
const { createDirectory } = directoryController;

// JWT Options - ensure these are securely configured and imported
const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET, // Use an environment variable for the secret key
};

// let User = models.userSchema;

// Create a new user
module.exports.createUser = async (req, res) => {
  // .catch((err) => reject(err));
  let { username, password, password2, email } = req.body;
  try {
    // Check if values are valid
    if (!username || !password || !password2 || !email) {
      res.status(400).json({ error: "Invalid values" });
      return;
    }

    if (username.length < 4) {
      return res.status(400).json({ error: "Username must be at least 4 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const user = await User.findOne({ username: username });

    if (user) {
      res.status(400).json({ error: "User already exists" });
      return;
    }
    // Check if email is used
    const userEmail = await User.findOne({ email: email });

    if (userEmail) {
      res.status(400).json({ error: "Email is already used." });
      return;
    }

    if (password != password2) {
      res.status(400).json({ error: "Passwords do not match" });
    } else {
      var salt = await bcrypt.genSalt(10).catch((err) => console.error(err));

      // console.log("Generated salt:", salt);
      const hash = await bcrypt.hash(password, salt);
      // password = hash;

      req.body.isRoot = true; // Add isRoot property to req object
      req.user = { rootDir: null };
      const rootDir = await directoryService.createDirectory(req, res);

      let newUser = new User({
        username: username,
        password: hash,
        rootDir: rootDir._id,
        email: email,
      });

      await newUser.save();
      return res.send("User " + newUser.username + " successfully registered");
    }
  } catch (err) {
    if (err.code == 11000) {
      res.send("User Name already taken" + err);
    } else {
      res.send("There was an error creating the user: " + err);
    }
  }
};

// Login user
module.exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Prepare JWT payload
    const payload = {
      _id: user._id,
      username: user.username,
      rootDir: user.rootDir, // Assuming this is the correct field
    };

    // Sign the JWT token with expiration of 30 days
    const token = jwt.sign(payload, jwtOptions.secretOrKey, {
      expiresIn: "30d",
    });

    res.json({ token });
  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.body.directoryId = user.rootDir;
    req.user = user;
    // Assuming the user has a 'rootDir' property
    const directoryData = await directoryController.readDirectory(req, res);

    if (!directoryData) {
      return res.status(404).json({ message: "Root directory not found" });
    }
    const combinedData = {
      user: user,
      directory: directoryData,
    };

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.deleteUserAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "User account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.getQuizzesInDirectory = async (req, res) => {
  try {
    const directoryId = req.params.directoryId;
    const quizzes = await Quiz.find({ parentDirectory: directoryId });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.getQuizDetails = async (req, res) => {
  try {
    // const quizId = req.params.quizId;

    return quizController.getQuiz(req, res);
    // const quiz = await Quiz.findById(quizId);
    // if (!quiz) {
    //   return res.status(404).json({ message: "Quiz not found" });
    // }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDirectory = async (req, res) => {
  try {
    const directoryId = req.params.directoryId;
    await Directory.findByIdAndDelete(directoryId);
    await Quiz.deleteMany({ parentDirectory: directoryId });
    res.json({ message: "Directory deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listSubdirectories = async (req, res) => {
  try {
    const directoryId = req.params.directoryId;
    const subdirectories = await Directory.find({
      parentDirectory: directoryId,
    });
    res.json(subdirectories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
