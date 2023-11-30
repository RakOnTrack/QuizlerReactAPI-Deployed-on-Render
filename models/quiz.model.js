const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  quizTitle: String,
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Questions", // Assuming 'Question' is the model name for questions
    },
  ],
  parentDirectory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory", // Reference to the Directory model
    // never gets used :( the addQuiz function just sets it to null if theres no directory provided.
    default: process.env.DEFAULT_ROOT_DIRECTORY, // Set the default value to homeroute for no parent directory
  },
  started: {
    type: Boolean,
    default: false,
  },
});

module.exports = quizSchema;
