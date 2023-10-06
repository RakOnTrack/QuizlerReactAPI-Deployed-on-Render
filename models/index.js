// Connection to Mongo Database
const mongoose = require("mongoose");

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        mongoose.connect(process.env.MONGO_URL);
        let db = mongoose.connection;
  
        db.on("error", (err) => {
            console.log(err);
            reject(err);
        });

        db.once('connected', () => {
            console.log('Database Connected');
        })
    
        db.once("open", () => {
            Question = require("./question.model.js")(mongoose);
            Quiz = require("./quiz.model.js")(mongoose);
            Directory = require("./directory.model.js")(mongoose);
            //User = require("./user.model.js")(mongoose);
            resolve();
        });
    });
  };