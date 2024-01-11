const mongoose = require("mongoose");



const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    unique: true,
  },
  password: String,
  rootDir: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory",
  },
});

module.exports = userSchema;
