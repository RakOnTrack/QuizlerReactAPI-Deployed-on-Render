const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  password: String,
  rootDir: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory",
  },
  email: {
    type: String,
    unique: true,
  },
});

module.exports = userSchema;
