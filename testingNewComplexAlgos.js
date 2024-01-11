const mockData = false;

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

function generateSndPrompt(studyContent, questionCount) {
  return `
    and make me ${questionCount} more questions based on this content:
  
  ${studyContent}. 
`;
}

const quizTopic = `"In the heart of a bustling city, people from all walks of life come together to celebrate their shared passions. 
The streets are alive with the rhythms of diverse cultures, and the aroma of street food fills the air. It's a place where art,
 music, and technology intersect, creating a vibrant and dynamic atmosphere. In this urban playground, creativity knows no bounds,
     and innovation thrives. As the sun sets, the city's skyline illuminates, casting a mesmerizing glow on the horizon. It's a place of 
  endless possibilities, where dreams are pursued and stories are written."

Please note that the token count can vary depending on the language model or text encoding being used. The above text is an approximate 150 tokens long using a typical English-based model.`;

const questionCount = 10;
const my_max_tokens = 162;

function truncateStringByToken(prompt) {
  const MAXINPUTTOKENS = my_max_tokens / 2;
  const tokenCount = countTokens(prompt);
  let returnLastPeriodIndex = quizTopic.length;

  if (tokenCount > MAXINPUTTOKENS) {
    const truncatePercentage = MAXINPUTTOKENS / tokenCount;
    const truncateIndex = Math.floor(prompt.length * truncatePercentage);
    const revisedPrompt = prompt.substring(0, truncateIndex);

    let lastPeriodIndex = -1;
    for (let i = revisedPrompt.length - 1; i >= 0; i--) {
      if (revisedPrompt[i] === ".") {
        lastPeriodIndex = i;
        break;
      }
    }

    if (lastPeriodIndex !== -1) {
      const finalPrompt = revisedPrompt.substring(0, lastPeriodIndex + 1);
      console.log(`Token count first Half: ${countTokens(finalPrompt)}`);
      returnLastPeriodIndex = lastPeriodIndex;
    }
  }
  return returnLastPeriodIndex;
}



const prompt = quizTopic;
const tokenCount = countTokens(prompt) + 73;
console.log(`Starting String Token count: ${tokenCount}`);

const orgStringTknCnt = countTokens(prompt);
if (orgStringTknCnt > my_max_tokens) {
  console.log(
    "Sorry, your prompt is " +
      orgStringTknCnt +
      " tokens long. Your prompt cannot be more than " +
      my_max_tokens +
      " tokens, please shorten it."
  );
  throw err;
}

async function generateResponses() {
  let lstPrdIdxTrncStr = truncateStringByToken(prompt);
  let combinedQuestions;

  const firstPrompt = generatePrompt(
    prompt.substring(0, lstPrdIdxTrncStr + 1),
    questionCount / 2
  );

  const sndPrompt = generateSndPrompt(
    prompt.substring(lstPrdIdxTrncStr + 1, prompt.length, questionCount / 2)
  );

  console.log("first prompt: " + firstPrompt);
  console.log("\nsecond prompt: " + sndPrompt);

  let messages = [{ role: "user", content: firstPrompt }];
  let firstResponse;

  if (!mockData) {
    const completion = await openai.chat.completions.create({
      model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
      messages: messages,
      temperature: 0.0,
      max_tokens: 800,
    });

    firstResponse = completion.choices[0].message.content;
    messages.push(completion.choices[0].message);
    messages.push({ role: "user", content: sndPrompt });
  } else {
    firstResponse = `{
      "quizTitle": "Urban Playground Quiz",
      "questions": [
        {
          "questionTitle": "What is the atmosphere of an urban playground like?",
          "correct_answer": "Vibrant and dynamic",
          "incorrect_answers": ["Quiet and peaceful", "Loud and chaotic", "Calm and serene"]
        },
        // ... (more questions)
      ]
    }`;
  }

  const frstResponseJSON = JSON.parse(firstResponse);
  console.log("first Response!: " + firstResponse);

  console.log("finished first Completion");

  let sndCompletionText;

  if (!mockData) {
    const sndCompletion = await openai.chat.completions.create({
      model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
      messages: messages,
      temperature: 0.0,
      max_tokens: 800,
    });

    sndCompletionText = sndCompletion.choices[0].message.content;
  } else {
    sndCompletionText = `{
    "quizTitle": "Urban Playground Quiz",
    "questions": [
      // ... (more questions)
    ]
  }`;
  }

  const sndFormattedResponse = JSON.parse(sndCompletionText);
  console.log("sndformattedResponse: " + sndCompletionText);

  combinedQuestions = frstResponseJSON.questions.concat(
    sndFormattedResponse.questions
  );

  return combinedQuestions;
}

async function main() {
  try {
    const questions = await generateResponses();
    console.log("question count: " + questions.length);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
