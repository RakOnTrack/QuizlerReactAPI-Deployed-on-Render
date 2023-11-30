//FIXME: Add details for function
const mockData = true;

const { Tiktoken } = require("@dqbd/tiktoken/lite");
const cl100k_base = require("@dqbd/tiktoken/encoders/cl100k_base.json");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});
function countTokens(prompt, model = "gpt2") {
  const encoding = new Tiktoken(
    cl100k_base.bpe_ranks,
    cl100k_base.special_tokens,
    cl100k_base.pat_str,
  );

  // Encode the prompt to count tokens
  const tokens = encoding.encode(prompt);

  // Free the encoder after use
  encoding.free();

  // Return the number of tokens
  return tokens.length;
}

function generatePrompt(studyContent, questionCount) {
  return `
  Make me a multiple-choice quiz with ${questionCount} questions about this content:
  
  
  ${studyContent}. 
  
  
  The quiz should be in this JSON format:

  {
    "quizTitle": STRING,
    "questions": [
      {
        "questionTitle": "",
        "correct_answer": "",
        "incorrect_answers": []
      },
      ...
    ]
  }
`;
}

function generateSndPrompt(studyContent) {
  return `
  and make me some more questions based on this content:
  
  ${studyContent}. 
  
`;
}

// Example usage:
const quizTopic = `"In the heart of a bustling city, people from all walks of life come together to celebrate their shared passions. The streets are alive with the rhythms of diverse cultures, and the aroma of street food fills the air. It's a place where art, music, and technology intersect, creating a vibrant and dynamic atmosphere. In this urban playground, creativity knows no bounds, and innovation thrives. As the sun sets, the city's skyline illuminates, casting a mesmerizing glow on the horizon. It's a place of endless possibilities, where dreams are pursued and stories are written. Welcome to a world of excitement and inspiration."

Please note that the token count can vary depending on the language model or text encoding being used. The above text is an approximate 150 tokens long using a typical English-based model.`;

const max_tokens = 162;

// countTokens(prompt);
function truncateStringByToken(prompt) {
  const MAXINPUTTOKENS = max_tokens / 2;
  // const prompt = generatePrompt(quizTopic, 5);
  const tokenCount = countTokens(prompt);
  let returnLastPeriodIndex = quizTopic.length;
  if (tokenCount > MAXINPUTTOKENS) {
    const truncatePercentage = MAXINPUTTOKENS / tokenCount;

    // Calculate the index to truncate the prompt.
    const truncateIndex = Math.floor(prompt.length * truncatePercentage);

    // Use the text before the calculated index as your prompt.
    const revisedPrompt = prompt.substring(0, truncateIndex);
    // console.log(`Token count revised: ${newTokenCount}`);

    // Find the index of the last period character.
    let lastPeriodIndex = -1;
    for (let i = revisedPrompt.length - 1; i >= 0; i--) {
      if (revisedPrompt[i] === ".") {
        lastPeriodIndex = i;
        break; // Exit the loop once a period is found.
      }
    }

    // if a period is found, display the results!
    if (lastPeriodIndex !== -1) {
      // The 'lastPeriodIndex' now contains the index of the last period character.
      // You can use this index to truncate the prompt to the last period.
      const finalPrompt = revisedPrompt.substring(0, lastPeriodIndex + 1);
      // console.log(`Final prompt for first half:  ${finalPrompt}`);
      console.log(`Token count first Half: ${countTokens(finalPrompt)}`);
      returnLastPeriodIndex = lastPeriodIndex;
    }
  }
  return returnLastPeriodIndex;
}

// second prompt function:
function getSecondCompletion(str, lstPrdIdxFstPrt) {
  const secondHalfOfStr = str.substring(lstPrdIdxFstPrt + 1, str.length);
  // console.log("Second half of string: " + secondHalfOfStr);
  // console.log(`Token count second half: ${countTokens(secondHalfOfStr)}`);
  return secondHalfOfStr;
}
// const prompt = generatePrompt(quizTopic, 5);
const prompt = quizTopic;
const tokenCount = countTokens(prompt) + 73;
console.log(`StartingString Token count: ${tokenCount}`);

const orgStringTknCnt = countTokens(prompt);
if (orgStringTknCnt > max_tokens) {
  console.log(
    "Sorry, your prompt is " +
      orgStringTknCnt +
      " tokens long. your prompt cannot be more than " +
      max_tokens +
      " tokens, please shorten it.",
  );

  throw err;
}

async function generateResponses() {
  let lstPrdIdxTrncStr = truncateStringByToken(prompt);

  const firstPrompt = generatePrompt(
    prompt.substring(0, lstPrdIdxTrncStr + 1),
    5,
  );
  const sndPrompt = generateSndPrompt(
    getSecondCompletion(prompt, lstPrdIdxTrncStr),
  );
  console.log("first prompt: " + firstPrompt);
  console.log("\nsecond prompt: " + sndPrompt);

  let firstResponse;
  if (!mockData) {
    // Use 'await' here to asynchronously wait for the completion
    const completion = await openai.completions.create({
      model: "text-davinci-003",
      prompt: firstPrompt,
      temperature: 0.0,
      max_tokens: 800,
    });
    firstResponse = completion.choices[0].text;
  } else {
    firstResponse = `{
      "quizTitle": "Urban Playground Quiz",
      "questions": [
        {
          "questionTitle": "What is the atmosphere of an urban playground like?",
          "correct_answer": "Vibrant and dynamic",
          "incorrect_answers": ["Quiet and peaceful", "Loud and chaotic", "Calm and serene"]
        },
        {
          "questionTitle": "What type of activities can be found in an urban playground?",
          "correct_answer": "Art, music, and technology",
          "incorrect_answers": ["Sports, shopping, and dining", "Gardening, cooking, and crafting", "Hiking, biking, and swimming"]
        },
        {
          "questionTitle": "What type of people can be found in an urban playground?",
          "correct_answer": "People from all walks of life",
          "incorrect_answers": ["Only young people", "Only wealthy people", "Only people with a certain hobby"]
        },
        {
          "questionTitle": "What type of environment is an urban playground?",
          "correct_answer": "Bustling city",
          "incorrect_answers": ["Quiet countryside", "Suburban neighborhood", "Remote mountain village"]
        },
        {
          "questionTitle": "What is the atmosphere of an urban playground filled with?",
          "correct_answer": "The rhythms of diverse cultures and the aroma of street food",
          "incorrect_answers": ["The sound of traffic and the smell of exhaust", "The sound of birds and the smell of flowers", "The sound of waves and the smell of salt"]
        }
      ]
    }`;
  }
  // let formattedResponse = JSON.parse(firstResponse); // Parse the JSON string
  const frstResponseJSON = JSON.parse(firstResponse); // Parse the JSON string
  console.log("first Response!: " + JSON.stringify(firstResponse, null, 2));
  // console.log("formattedResponse: " + JSON.stringify(firstResponse));

  console.log("finished first Completion");

  // Use 'await' here to asynchronously wait for the completion
  // const = await openai.chat.completions.create({
  let sndCompletionText;
  if (!mockData) {
    const messages = [
      { role: "user", content: firstPrompt },
      { role: "assistant", content: firstResponse },
      { role: "user", content: sndPrompt },
    ];
    const sndCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.0,
      max_tokens: 800,
    });

    sndCompletionText = sndCompletion.choices[0].message.content;
  } else {
    sndCompletionText = `{
    "quizTitle": "Urban Playground Quiz",
    "questions": [
      {
        "questionTitle": "What is the atmosphere of an urban playground like?",
        "correct_answer": "Vibrant and dynamic",
        "incorrect_answers": ["Quiet and peaceful", "Loud and chaotic", "Calm and serene"]
      },
      {
        "questionTitle": "What type of activities can be found in an urban playground?",
        "correct_answer": "Art, music, and technology",
        "incorrect_answers": ["Sports, shopping, and dining", "Gardening, cooking, and crafting", "Hiking, biking, and swimming"]
      },
      {
        "questionTitle": "What type of people can be found in an urban playground?",
        "correct_answer": "People from all walks of life",
        "incorrect_answers": ["Only young people", "Only wealthy people", "Only people with a certain hobby"]
      },
      {
        "questionTitle": "What type of environment is an urban playground?",
        "correct_answer": "Bustling city",
        "incorrect_answers": ["Quiet countryside", "Suburban neighborhood", "Remote mountain village"]
      },
      {
        "questionTitle": "What is the atmosphere of an urban playground filled with?",
        "correct_answer": "The rhythms of diverse cultures and the aroma of street food",
        "incorrect_answers": ["The sound of traffic and the smell of exhaust", "The sound of birds and the smell of flowers", "The sound of waves and the smell of salt"]
      }
    ]
  }`;
  }

  const sndFormattedResponse = JSON.parse(sndCompletionText); // Parse the JSON string
  console.log("sndformattedResponse: " + sndCompletionText);
  const combinedQuestions = frstResponseJSON.questions.concat(
    sndFormattedResponse.questions,
  );
  // sndFormattedResponse.questions.forEach((question) => {
  //   frstResponseJSON.questions.push(question);
  // });
}
// ... (previous code)

async function main() {
  try {
    const questions = await generateResponses();
    console.log("question count: " + questions.length);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// main();
