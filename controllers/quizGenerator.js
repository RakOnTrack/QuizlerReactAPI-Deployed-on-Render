const { Tiktoken } = require("@dqbd/tiktoken/lite");
const cl100k_base = require("@dqbd/tiktoken/encoders/cl100k_base.json");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function countTokens(prompt, model = "gpt2") {
  const encoding = new Tiktoken(
    cl100k_base.bpe_ranks,
    cl100k_base.special_tokens,
    cl100k_base.pat_str
  );
  const tokens = encoding.encode(prompt);
  encoding.free();
  return tokens.length;
}
const mockData = false;

function truncateStringByToken(quizTopic, max_tokens) {
  const MAXINPUTTOKENS = max_tokens / 2;
  const tokenCount = countTokens(quizTopic);
  console.log(`Token count : ${tokenCount}`);

  // If the total number of tokens is less than or equal to MAXINPUTTOKENS, no truncation is needed.
  if (tokenCount <= MAXINPUTTOKENS) {
    return quizTopic.length; // Return the full length since no truncation is needed.
  }

  const middleIndex = Math.floor(quizTopic.length / 2);

  // Find the first period before the middle index to ensure we end at a complete sentence
  let lastPeriodIndex = quizTopic.lastIndexOf(".", middleIndex);

  // If no period is found in the first half, it's better to keep the whole string rather than cut in the middle of a sentence.
  // But for the purpose of following the instructions strictly, fallback to the middle index.
  if (lastPeriodIndex === -1) lastPeriodIndex = middleIndex;

  console.log(`Truncate index: ${lastPeriodIndex}`);
  return lastPeriodIndex;
}

async function makeSecondParseAttemptWithAI(jsonContent) {
  // Create a more detailed and specific prompt for the AI
  const prompt = `
  Given the following JSON string representing quiz data, it appears that the last 
  question may be incomplete, leading to syntax errors preventing the string from 
  being parsed using JSON.parse() in JavaScript. Please remove any incomplete content
  at the end, ensure that the last question is fully complete, and properly close the JSON
  object with the necessary closing braces. Return the corrected and complete JSON string.
  
  Original JSON string with potential incomplete content:
  -----------------------------------
  ${jsonContent}
  -----------------------------------
  
  Ensure the final JSON string is well-formed, with all objects and arrays properly closed,
   and can be parsed without errors. Provide the corrected JSON string below.
  `;

  let messages = [{ role: "user", content: prompt }];

  const completion = await openai.chat.completions.create({
    model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
    messages: messages,
    temperature: 0.0,
    max_tokens: 1000,
  });

  let response = completion.choices[0].message.content;
  let responseJSON;
  try {
    responseJSON = JSON.parse(response);
    console.log("Parsed JSON successfully on second try.");
  } catch (error) {
    console.error("Failed to parse JSON:", error);
  }
  return responseJSON;
}

function generatePrompt(studyContent, questionCount) {
  return `
Please create a multiple-choice quiz based on the provided content. The quiz 
should have exactly ${questionCount} questions. Each question must include 
one correct answer and multiple incorrect answers. Follow the JSON structure 
below for formatting the quiz:

{
  "quizTitle": "REPLACE_WITH_A_RELEVANT_TITLE",
  "questions": [
    {
      "questionTitle": "REPLACE_WITH_QUESTION",
      "correct_answer": "REPLACE_WITH_CORRECT_ANSWER",
      "incorrect_answers": [
        "REPLACE_WITH_INCORRECT_ANSWER_1",
        "REPLACE_WITH_INCORRECT_ANSWER_2",
        "REPLACE_WITH_INCORRECT_ANSWER_3"
      ]
    }
    // Repeat this question structure ${questionCount} times
  ]
}

Content for quiz creation:
"${studyContent}"

Ensure the quiz title is relevant to the content provided. If the content is 
insufficient for ${questionCount} questions, use your best judgment to create 
relevant, engaging questions. Each question should be unique and provide a clear 
choice between the correct and incorrect answers.
`;
}

function generateSndPrompt(quizTopic, studyContent, questionCount) {
  return `
Based on the topic "${quizTopic}" and the additional content provided below, 
generate ${questionCount} new multiple-choice questions to expand the existing quiz.
 Ensure each new question includes one correct answer and multiple incorrect answers.
  Use the JSON format as shown:

{
  "quizTitle": "${quizTopic}",
  "questions": [
    {
      "questionTitle": "REPLACE_WITH_NEW_QUESTION",
      "correct_answer": "REPLACE_WITH_CORRECT_ANSWER",
      "incorrect_answers": [
        "REPLACE_WITH_INCORRECT_ANSWER_1",
        "REPLACE_WITH_INCORRECT_ANSWER_2",
        "REPLACE_WITH_INCORRECT_ANSWER_3"
      ]
    }
    // Include additional questions to meet the total count of ${questionCount}
  ]
}

Additional content for question generation:
"${studyContent}"

Each question should be distinct and relevant to the quiz topic, providing
educational value and challenging the quiz taker's understanding of the subject. 
If necessary, creatively use the provided content to formulate questions that fit 
the quiz topic.
`;
}

async function generateQuiz(quizTopic, questionCount = 10) {
  const max_tokens = 6000;

  const lstPrdIdxTrncStr = truncateStringByToken(quizTopic, max_tokens);

  const firstPrompt = generatePrompt(
    quizTopic.substring(0, lstPrdIdxTrncStr + 1),
    questionCount / 2
  );

  console.log("first prompt: " + firstPrompt);

  let messages = [{ role: "user", content: firstPrompt }];
  let firstResponse;

  if (!mockData) {
    const completion = await openai.chat.completions.create({
      model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
      messages: messages,
      temperature: 0.0,
      max_tokens: 1000,
    });

    firstResponse = completion.choices[0].message.content;
    // messages.push(completion.choices[0].message);
  } else {
    firstResponse = `{
      "quizTitle": "Travis Scott Quiz",
      "questions": [
        {
          "questionTitle": "What is Travis Scott's real name?",
          "correct_answer": "Jacques Bermon Webster II",
          "incorrect_answers": ["Scott Mescudi", "Travi$ Scott", "Kid Cudi"]
        },
        {
          "questionTitle": "How many number-one hits has Travis Scott achieved on the US Billboard Hot 100 chart?",
          "correct_answer": "4",
          "incorrect_answers": ["2", "6", "8"]
        },
        {
          "questionTitle": "Which of the following awards has Travis Scott NOT won?",
          "correct_answer": "Grammy Award",
          "incorrect_answers": ["Latin Grammy Award", "Billboard Music Award", "MTV Video Music Award"]
        },
        {
          "questionTitle": "Which of Travis Scott's albums became his first number-one album on the Billboard 200 chart?",
          "correct_answer": "Birds in the Trap Sing McKnight",
          "incorrect_answers": ["Rodeo", "Astroworld", "JackBoys"]
        },
        {
          "questionTitle": "In which year did the mass-casualty crowd crush incident occur during Travis Scott's Astroworld Festival?",
          "correct_answer": "2021",
          "incorrect_answers": ["2019", "2018", "2020"]
        }
      ]
    }`;
  }
  let frstResponseJSON;
  try {
    frstResponseJSON = JSON.parse(firstResponse);
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    frstResponseJSON = await makeSecondParseAttemptWithAI(firstResponse);
  }
  console.log("first Response!: " + firstResponse);

  console.log("finished first Completion");

  const sndPrompt = generateSndPrompt(
    frstResponseJSON.quizTitle,
    //quiz content from last period index of the truncated string
    quizTopic.substring(
      lstPrdIdxTrncStr + 1,
      quizTopic.length,
      questionCount / 2
    )
  );
  console.log("\nsecond prompt: " + sndPrompt);

  let sndCompletionText;

  messages = [{ role: "user", content: sndPrompt }];

  if (!mockData) {
    const sndCompletion = await openai.chat.completions.create({
      model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
      messages: messages,
      temperature: 0.0,
      max_tokens: 1000,
    });

    sndCompletionText = sndCompletion.choices[0].message.content;
  } else {
    sndCompletionText = ` {
      "quizTitle": "Travis Scott's Music Career",
      "questions": [
        {
          "questionTitle": "In which year did Travis Scott announce the launch of his own imprint, Cactus Jack Records?",
          "correct_answer": "2017",
          "incorrect_answers": ["2016", "2018", "2019"]
        },
        {
          "questionTitle": "What was the name of Travis Scott's third studio album?",
          "correct_answer": "Astroworld",
          "incorrect_answers": ["Birds in the Trap Sing McKnight", "Rodeo", "Days Before Rodeo"]
        },
        {
          "questionTitle": "Which Canadian rapper did Travis Scott collaborate with on the single 'Portland'?",
          "correct_answer": "Drake",
          "incorrect_answers": ["The Weeknd", "Kanye West", "Post Malone"]
        },
        {
          "questionTitle": "What was the name of Travis Scott's collaborative studio album with Quavo?",
          "correct_answer": "Huncho Jack, Jack Huncho",
          "incorrect_answers": ["Astroworld", "Birds in the Trap Sing McKnight", "Rodeo"]
        },
        {
          "questionTitle": "Which of Travis Scott's singles peaked at number one on the Billboard Hot 100?",
          "correct_answer": "Sicko Mode",
          "incorrect_answers": ["Butterfly Effect", "Highest in the Room", "Franchise"]
        }
      ]
    }`;
  }

  let sndFormattedResponse;
  try {
    sndFormattedResponse = JSON.parse(sndCompletionText);
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    sndFormattedResponse =
      await makeSecondParseAttemptWithAI(sndCompletionText);
  }

  console.log("sndformattedResponse: " + sndCompletionText);

  frstResponseJSON.questions = frstResponseJSON.questions.concat(
    sndFormattedResponse.questions
  );

  // Ensure the correct number of questions
  if (frstResponseJSON.questions.length > questionCount) {
    // If too many questions, remove the excess.
    frstResponseJSON.questions = frstResponseJSON.questions.slice(
      0,
      questionCount
    );
  }

  return frstResponseJSON;
}

module.exports = {
  generateQuiz,
};
