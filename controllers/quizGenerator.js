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
  let returnLastPeriodIndex = quizTopic.length;

  if (tokenCount > MAXINPUTTOKENS) {
    const truncatePercentage = MAXINPUTTOKENS / tokenCount;
    const truncateIndex = Math.floor(quizTopic.length * truncatePercentage);
    const revisedPrompt = quizTopic.substring(0, truncateIndex);

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
  } else if (tokenCount > max_tokens) {
    console.log(
      "Sorry, your prompt is " +
        orgStringTknCnt +
        " tokens long. Your prompt cannot be more than " +
        my_max_tokens +
        " tokens, please shorten it."
    );
    throw err;
  }
  return returnLastPeriodIndex;
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

function generateSndPrompt(quizTopic, studyContent, questionCount) {
  return `
    Generate ${questionCount} additional multiple-choice questions for the quiz on ${quizTopic}. Consider the following content:

    ${studyContent}.

    Provide the questions in the following JSON format:

    {
      "quizTitle": "YourQuizTitle",
      "questions": [
        {
          "questionTitle": "Question 1",
          "correct_answer": "Correct Answer 1",
          "incorrect_answers": ["Incorrect Answer 1", "Incorrect Answer 2", "Incorrect Answer 3"]
        },
        {
          "questionTitle": "Question 2",
          "correct_answer": "Correct Answer 2",
          "incorrect_answers": ["Incorrect Answer 1", "Incorrect Answer 2", "Incorrect Answer 3"]
        },
        ...
      ]
    }

    Note: Consider the quizTitle "${quizTopic}" when generating questions to maintain context.
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
      max_tokens: 800,
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

  const frstResponseJSON = JSON.parse(firstResponse);
  console.log("first Response!: " + firstResponse);

  console.log("finished first Completion");

  const sndPrompt = generateSndPrompt(
    frstResponseJSON.quizTitle,
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
      max_tokens: 800,
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

  const sndFormattedResponse = JSON.parse(sndCompletionText);
  console.log("sndformattedResponse: " + sndCompletionText);

  frstResponseJSON.questions = frstResponseJSON.questions.concat(
    sndFormattedResponse.questions
  );

  return frstResponseJSON;
}

module.exports = {
  generateQuiz,
};

// async function main() {
//   try {
//     const quizTopic = `"In the heart of a bustling city, people from all walks of life come together to celebrate their shared passions.
//         The streets are alive with the rhythms of diverse cultures, and the aroma of street food fills the air. It's a place where art,
//         music, and technology intersect, creating a vibrant and dynamic atmosphere. In this urban playground, creativity knows no bounds,
//         and innovation thrives. As the sun sets, the city's skyline illuminates, casting a mesmerizing glow on the horizon. It's a place of
//         endless possibilities, where dreams are pursued and stories are written."

//         Please note that the token count can vary depending on the language model or text encoding being used. The above text is an approximate 150 tokens long using a typical English-based model.`;

//     const questions = await generateQuiz(quizTopic);
//     console.log("question count: " + questions.length);
//   } catch (error) {
//     console.error("An error occurred:", error);
//   }
// }

// main();
