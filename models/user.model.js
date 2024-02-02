const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  password: String,
  rootDir: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory",
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
});

module.exports = userSchema;
