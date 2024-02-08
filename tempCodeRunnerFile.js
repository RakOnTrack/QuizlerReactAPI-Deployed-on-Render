const { Tiktoken } = require("@dqbd/tiktoken/lite");
const cl100k_base = require("@dqbd/tiktoken/encoders/cl100k_base.json");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function removeTrailingCommas(jsonString) {
  // Regular expression to find trailing commas before closing braces or brackets
  const trailingCommaRegex = /\,(?=\s*?[\}\]])/g;

  // Replace occurrences of trailing commas identified by the regex
  const correctedJsonString = jsonString.replace(trailingCommaRegex, "");

  return correctedJsonString;
}

// Example of a malformed but complete JSON string with trailing commas
// const malformedJsonWithTrailingCommas = `{
//   "quizTitle": "Complexity and Performance Quiz",
//   "questions": [
//     {
//       "questionTitle": "What is parallel programming?",
//       "correct_answer": "Using multiple processors to execute instructions concurrently",
//       "incorrect_answers": [
//         "Using a single processor to execute instructions concurrently",
//         "Using multiple processors to execute instructions sequentially",
//         "Using a single processor to execute instructions sequentially",
//       ],
//     },
//     {
//       "questionTitle": "What is elapsed time?",
//       "correct_answer": "The ratio of wall-clock time in serial execution to wall-clock time in parallel execution",
//       "incorrect_answers": [
//         "The total time taken to solve a problem",
//         "The time spent on each computational unit",
//         "The time required for process optimization",
//       ],
//     },
//   ],
// }`;
const malformedJsonWithTrailingCommas =
  '{\n  "quizTitle": "Complexity and Performance Quiz",\n  "questions": [\n    {\n      "questionTitle": "What is parallel programming?",\n      "correct_answer": "Using multiple processors to execute instructions concurrently",\n      "incorrect_answers": [\n        "Using a single processor to execute instructions concurrently",\n        "Using multiple processors to execute instructions sequentially",\n        "Using a single processor to execute instructions sequentially"\n      ]\n    },\n    {\n      "qu…_answers": ["Space required and communication time", "CPU operations and GPU performance", "Serial execution time"]\n    },\n    {\n      "questionTitle": "What is elapsed time?",\n      "correct_answer": "The ratio of wall-clock time in serial execution to wall-clock time in parallel execution",\n      "incorrect_answers": [\n        "The total time taken to solve a problem",\n        "The time spent on each computational unit",\n        "The time required for process optimization"\n      ]\n    },\n   ';

const correctedJson = removeTrailingCommas(malformedJsonWithTrailingCommas);
console.log(correctedJson);

try {
  const frstResponseJSON = JSON.parse(correctedJson);
  console.log("Parsed JSON successfully:", frstResponseJSON);
} catch (error) {


  const firstPrompt = "this content i have is having an error being JSON.parse(). Can you please fix this ? " + correctedJson;
  let messages = [{ role: "user", content: firstPrompt }];




  const completion = await openai.chat.completions.create({
    model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
    messages: messages,
    temperature: 0.0,
    max_tokens: 800,
  });

  console.error("Failed to parse JSON:", error);
}
