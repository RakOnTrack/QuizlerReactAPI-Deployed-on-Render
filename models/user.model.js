const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: String,
  rootDir: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory",
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  isTemporary: { type: Boolean, default: false }, // Indicates if the user is temporary
});

module.exports = userSchema;
