const mongoose = require("mongoose");

// Define the schema for OpenAI function input/output results
const openAiRecordSchema = new mongoose.Schema(
  {
    inputString: {
      type: String,
      required: true,
    },
    questionCount: {
      type: Number,
      required: true,
    },
    output: {
      type: String,
      //   required: true,
    },
    success: {
      type: Boolean,
      default: false,
    },
    questionCountOutput: {
      type: Number,
    },
  },
  { timestamps: true },
); // Including timestamps to track when each interaction occurred

module.exports = openAiRecordSchema;
