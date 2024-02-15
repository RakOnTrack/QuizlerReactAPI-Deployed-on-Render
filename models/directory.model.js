const mongoose = require("mongoose");

const directorySchema = new mongoose.Schema({
  name: String, // Name of the directory
  quizzes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz", // Reference to the Quiz model
      default: [],
    },
  ],
  subdirectories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Directory", // Reference to the Directory model itself (for subdirectories)
      default: [],
    },
  ],
  parentDirectory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory",
    default: null, // Set the default value to homeroute for no parent directory
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = directorySchema;
