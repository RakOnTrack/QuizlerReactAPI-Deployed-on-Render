// Connection to Mongo Database

//TODO: Removing of old connection to database
/* const mongoose = require("mongoose");

let Question;
let Quiz;
let Directory;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
      let db = mongoose.createConnection(process.env.MONGO_URL);
  
      db.on("error", (err) => {
        reject(err);
      });
  
      db.once("open", () => {
        Question = require("../models/question.model");
        Quiz = require("../models/quiz.model");
        Directory = require("../models/directory.model");
        resolve();
      });
    });
  }; */

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.Question = require("../models/question.model.js");
db.Quiz = require("../models/quiz.model.js");
db.Directory = require("../models/directory.model.js");

module.exports = db;
