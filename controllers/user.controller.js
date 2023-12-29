const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const directoryService = require("../controllers/directory.controller.js");

const passport = require("passport");
const passportJWT = require("passport-jwt");
const db = require("../models/index"); // retrieve mongo connection
let User = db.mongoose.connection.model(
  "User",
  require("../models/user.model")
);

// JWT Options - ensure these are securely configured and imported
const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET, // Use an environment variable for the secret key
};

// let User = models.userSchema;


// Create a new user
module.exports.createUser = async (req, res) => {
  // .catch((err) => reject(err));
  let { name, password, password2 } = req.body;
  try {
    // Check if values are valid
    if (!name || !password) {
      res.status(400).json({ error: "Invalid values" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const user = await User.findOne({ userName: name });

    if (user) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    if (password != password2) {
      res.status(400).json({ error: "Passwords do not match" });
    } else {
      // Create new user
      // });
      // var salt = bcrypt.genSalt(10, (err, salt));
      var salt = await bcrypt.genSalt(10).catch((err) => console.error(err));

      // console.log("Generated salt:", salt);
      const hash = await bcrypt.hash(password, salt);
      // password = hash;

      req.body.isRoot = true; // Add isRoot property to req object
      const rootDir = await directoryService.createDirectory(req, res);

      let newUser = new User({
        userName: name,
        password: hash,
        rootDir: rootDir._id,
      });
      // console.log(newUser);
      newUser.save();
      res.send("User " + newUser.userName + " successfully registered");
    }
  } catch (err) {
    if (err.code == 11000) {
      res.send("User Name already taken");
    } else {
      res.send("There was an error creating the user: " + err);
    }
    // });
  }
};

// let jwtOptions = {
//   jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
//   secretOrKey: "your_secret_key",
// };

// Login user
module.exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username
    const user = await User.findOne({ userName: username });
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
      userName: user.userName,
      rootDir: user.rootDir, // Assuming this is the correct field
    };

    // Sign the JWT token
    const token = jwt.sign(payload, jwtOptions.secretOrKey, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Check if user exists
module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({ userName: userData.userName })
      .exec()
      .then((user) => {
        bcrypt.compare(userData.password, user.password).then((res) => {
          if (res === true) {
            resolve(user);
          } else {
            reject("Incorrect password for user " + userData.userName);
          }
        });
      })
      .catch((err) => {
        reject("Unable to find user " + userData.userName);
      });
  });
};

// module.exports.getFavourites = function (id) {
//     return new Promise(function (resolve, reject) {

//         User.findById(id)
//             .exec()
//             .then(user => {
//                 resolve(user.favourites)
//             }).catch(err => {
//                 reject(`Unable to get favourites for user with id: ${id}`);
//             });
//     });
// }

// module.exports.addFavourite = function (id, favId) {

//     return new Promise(function (resolve, reject) {

//         User.findById(id).exec().then(user => {
//             if (user.favourites.length < 50) {
//                 User.findByIdAndUpdate(id,
//                     { $addToSet: { favourites: favId } },
//                     { new: true }
//                 ).exec()
//                     .then(user => { resolve(user.favourites); })
//                     .catch(err => { reject(`Unable to update favourites for user with id: ${id}`); })
//             } else {
//                 reject(`Unable to update favourites for user with id: ${id}`);
//             }

//         })

//     });

// }

// module.exports.removeFavourite = function (id, favId) {
//     return new Promise(function (resolve, reject) {
//         User.findByIdAndUpdate(id,
//             { $pull: { favourites: favId } },
//             { new: true }
//         ).exec()
//             .then(user => {
//                 resolve(user.favourites);
//             })
//             .catch(err => {
//                 reject(`Unable to update favourites for user with id: ${id}`);
//             })
//     });
// }

// module.exports.getHistory = function (id) {
//     return new Promise(function (resolve, reject) {

//         User.findById(id)
//             .exec()
//             .then(user => {
//                 resolve(user.history)
//             }).catch(err => {
//                 reject(`Unable to get history for user with id: ${id}`);
//             });
//     });
// }

// module.exports.addHistory = function (id, historyId) {

//     return new Promise(function (resolve, reject) {

//         User.findById(id).exec().then(user => {
//             if (user.favourites.length < 50) {
//                 User.findByIdAndUpdate(id,
//                     { $addToSet: { history: historyId } },
//                     { new: true }
//                 ).exec()
//                     .then(user => { resolve(user.history); })
//                     .catch(err => { reject(`Unable to update history for user with id: ${id}`); })
//             } else {
//                 reject(`Unable to update history for user with id: ${id}`);
//             }
//         })
//     });
// }

// module.exports.removeHistory = function (id, historyId) {
//     return new Promise(function (resolve, reject) {
//         User.findByIdAndUpdate(id,
//             { $pull: { history: historyId } },
//             { new: true }
//         ).exec()
//             .then(user => {
//                 resolve(user.history);
//             })
//             .catch(err => {
//                 reject(`Unable to update history for user with id: ${id}`);
//             })
//     });
// }
