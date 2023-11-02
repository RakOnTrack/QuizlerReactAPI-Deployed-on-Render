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
    cl100k_base.pat_str
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

// function generateSndPrompt(studyContent) {
//   return `
//   and make me some more questions based on this content:

//   ${studyContent}.

// `;
// }

// // Example usage:
// const quizTopic = `"In the heart of a bustling city, people from all walks of life come together to celebrate their shared passions. The streets are alive with the rhythms of diverse cultures, and the aroma of street food fills the air. It's a place where art, music, and technology intersect, creating a vibrant and dynamic atmosphere. In this urban playground, creativity knows no bounds, and innovation thrives. As the sun sets, the city's skyline illuminates, casting a mesmerizing glow on the horizon. It's a place of endless possibilities, where dreams are pursued and stories are written. Welcome to a world of excitement and inspiration."

// Please note that the token count can vary depending on the language model or text encoding being used. The above text is an approximate 150 tokens long using a typical English-based model.`;

// const max_tokens = 162;

// // countTokens(prompt);
// function truncateStringByToken(prompt) {
//   const MAXINPUTTOKENS = max_tokens / 2;
//   // const prompt = generatePrompt(quizTopic, 5);
//   const tokenCount = countTokens(prompt);
//   let returnLastPeriodIndex = quizTopic.length;
//   if (tokenCount > MAXINPUTTOKENS) {
//     const truncatePercentage = MAXINPUTTOKENS / tokenCount;

//     // Calculate the index to truncate the prompt.
//     const truncateIndex = Math.floor(prompt.length * truncatePercentage);

//     // Use the text before the calculated index as your prompt.
//     const revisedPrompt = prompt.substring(0, truncateIndex);
//     // console.log(`Token count revised: ${newTokenCount}`);

//     // Find the index of the last period character.
//     let lastPeriodIndex = -1;
//     for (let i = revisedPrompt.length - 1; i >= 0; i--) {
//       if (revisedPrompt[i] === ".") {
//         lastPeriodIndex = i;
//         break; // Exit the loop once a period is found.
//       }
//     }

//     // if a period is found, display the results!
//     if (lastPeriodIndex !== -1) {
//       // The 'lastPeriodIndex' now contains the index of the last period character.
//       // You can use this index to truncate the prompt to the last period.
//       const finalPrompt = revisedPrompt.substring(0, lastPeriodIndex + 1);
//       // console.log(`Final prompt for first half:  ${finalPrompt}`);
//       console.log(`Token count first Half: ${countTokens(finalPrompt)}`);
//       returnLastPeriodIndex = lastPeriodIndex;
//     }
//   }
//   return returnLastPeriodIndex;
// }

// // second prompt function:
// function getSecondCompletion(str, lstPrdIdxFstPrt) {
//   const secondHalfOfStr = str.substring(lstPrdIdxFstPrt + 1, str.length);
//   // console.log("Second half of string: " + secondHalfOfStr);
//   // console.log(`Token count second half: ${countTokens(secondHalfOfStr)}`);
//   return secondHalfOfStr;
// }
// // const prompt = generatePrompt(quizTopic, 5);
// const prompt = quizTopic;
// const tokenCount = countTokens(prompt) + 73;
// console.log(`StartingString Token count: ${tokenCount}`);

// const orgStringTknCnt = countTokens(prompt);
// if (orgStringTknCnt > max_tokens) {
//   console.log(
//     "Sorry, your prompt is " +
//       orgStringTknCnt +
//       " tokens long. your prompt cannot be more than " +
//       max_tokens +
//       " tokens, please shorten it."
//   );

//   throw err;
// }

//   let lstPrdIdxTrncStr = truncateStringByToken(prompt);

//   const firstPrompt = generatePrompt(
//     prompt.substring(0, lstPrdIdxTrncStr + 1),
//     5
//   );
//   const sndPrompt = generateSndPrompt(
//     getSecondCompletion(prompt, lstPrdIdxTrncStr)
//   );
//   console.log("first prompt: " + firstPrompt);
//   console.log("\nsecond prompt: " + sndPrompt);

//   let firstResponse;
//   if (!mockData) {
//     // Use 'await' here to asynchronously wait for the completion
//     const completion = await openai.completions.create({
//       model: "text-davinci-003",
//       prompt: firstPrompt,
//       temperature: 0.0,
//       max_tokens: 800,
//     });
//     firstResponse = completion.choices[0].text;
//   } else {
//     firstResponse = `{
//       "quizTitle": "Urban Playground Quiz",
//       "questions": [
//         {
//           "questionTitle": "What is the atmosphere of an urban playground like?",
//           "correct_answer": "Vibrant and dynamic",
//           "incorrect_answers": ["Quiet and peaceful", "Loud and chaotic", "Calm and serene"]
//         },
//         {
//           "questionTitle": "What type of activities can be found in an urban playground?",
//           "correct_answer": "Art, music, and technology",
//           "incorrect_answers": ["Sports, shopping, and dining", "Gardening, cooking, and crafting", "Hiking, biking, and swimming"]
//         },
//         {
//           "questionTitle": "What type of people can be found in an urban playground?",
//           "correct_answer": "People from all walks of life",
//           "incorrect_answers": ["Only young people", "Only wealthy people", "Only people with a certain hobby"]
//         },
//         {
//           "questionTitle": "What type of environment is an urban playground?",
//           "correct_answer": "Bustling city",
//           "incorrect_answers": ["Quiet countryside", "Suburban neighborhood", "Remote mountain village"]
//         },
//         {
//           "questionTitle": "What is the atmosphere of an urban playground filled with?",
//           "correct_answer": "The rhythms of diverse cultures and the aroma of street food",
//           "incorrect_answers": ["The sound of traffic and the smell of exhaust", "The sound of birds and the smell of flowers", "The sound of waves and the smell of salt"]
//         }
//       ]
//     }`;
//   }
//   // let formattedResponse = JSON.parse(firstResponse); // Parse the JSON string
//   const frstResponseJSON = JSON.parse(firstResponse); // Parse the JSON string
//   console.log("first Response!: " + JSON.stringify(firstResponse, null, 2));
//   // console.log("formattedResponse: " + JSON.stringify(firstResponse));

//   console.log("finished first Completion");

//   // Use 'await' here to asynchronously wait for the completion
//   // const = await openai.chat.completions.create({
//   let sndCompletionText;
//   if (!mockData) {

async function generateResponses() {
  const str = `
    This chapter covers
• Making money by implementing mathematical ideas in code
• Avoiding common pitfalls in math learning
• Thinking like a programmer to understand math
• Using Python as a powerful and extensible calculator
Math is like baseball or poetry or fine wine. Some people are so fascinated by math that they
devote their whole lives to it, while others feel like they just don’t “get it.” You’ve probably
already been forced into one camp or another by twelve years of compulsory math education
in school.
What if we learned about fine wine in school like we learn math? I don’t think I’d like wine at
all if I got lectured on grape varietals and fermentation techniques for an hour a day. Maybe
in such a world, I’d need to consume three or four glasses for homework, as assigned by the
teacher. Sometimes this would be a delicious and educational experience, but sometimes I
wouldn’t feel like getting loaded on a school night. My experience in math class went
something like this, and it turned me off of the subject for a while. Like wine, mathematics is
an acquired taste, and a daily grind of lectures and assignments is no way to refine one’s
palate.
If you miss this, it’s easy to think you’re either “cut out” for math or you aren’t. If you
already believe in yourself and you’re excited to start learning, that’s great! Otherwise, this
chapter is designed for you. Feeling intimidated by math is so common, it has a name: “math
anxiety.” I hope to dispel any anxiety you might have, and show you that math can be a
stimulating experience rather than a frightening one. All you need are the right tools and the
right mindset.
The main tool for learning in this book is Python programming. I’m guessing when you
learned math in high school, you saw it written on the blackboard and not written in computer

©Manning Publications Co. To comment go to liveBook 1

code. This is a shame, because a high-level programming language is a far more powerful
than a blackboard, and far more versatile than whatever overpriced graphing calculator you
may have used. An advantage of meeting math in code is that the ideas have to be precise
enough for a computer to understand, there’s never any hand-waving about what new
symbols mean.
As with learning any new subject, the best way to set yourself up for success is to want to
learn it. There are plenty of good reasons. You could be intrigued by the beauty of
mathematical concepts or enjoy the “brain-teaser” feel of math problems. Maybe there’s an
app or game you’ve been dreaming of building that needs some math to make it work. For
now, I’ll try to motivate you with an even lower common denominator: solving mathematical
problems with software can make you filthy rich.
1.1 Solving lucrative problems with math and software
A classic criticism you hear in high school math class is “when am I ever going to use this stuff
in real life?” Our teachers told us that math would help us succeed professionally and make
money. I think they were right about this, even though their examples were off. For
instance, I don’t calculate my compounding bank interest by hand (and neither does my
bank). Maybe if I became a construction site surveyor, as my trigonometry teacher
suggested, I’d be using sines and cosines every day to earn my paycheck.
It turns out the “real world” applications from high school textbooks aren’t that useful. Still,
there are real applications of math out there, and some of them are mind-bogglingly lucrative.
Many of them are solved by translating the right mathematical idea into usable software. I’ll
share some of my favorite examples.
1.1.1 Predicting financial market movements
We’ve all heard legends of stock traders making millions of dollars by buying and selling the
right stocks at the right time. Based on the movies I’ve seen, I always pictured a trader as a
middle-aged man in a suit yelling at his broker over a cell phone while driving around in a
sports car. Maybe this stereotype was spot-on at one point, but the situation is different
today. Holed up in back-offices of skyscrapers all over Manhattan are thousands of people
called quants. Quants, otherwise known as quantitative analysts, design mathematical
algorithms that automatically trade stocks and earn a profit. They don’t wear suits and they
don’t spend any time yelling on their cell phones, but I’m sure many of them still own very
nice sports cars.
So how does a quant write a program that automatically makes money? The best answers to
this question are closely-guarded trade secrets, but you can be sure they involve a lot of
math. We can look at a toy example to get a sense of how an automated trading strategy
might work.
Stocks represents an ownership stakes in companies. When the market perceives a
company is doing well, the price goes up: buying the stock becomes more costly and selling it
becomes more rewarding. Stock prices change erratically and in real time. A graph of a stock
price over a day of trading might look something like this.

©Manning Publications Co. To comment go to liveBook 2

Figure 1.1 Typical graph of a stock price over time.
If you bought a thousand shares of this stock for $24 around minute 100 and sold them for
$38 at minute 400, you would make off with $14,000 for the day. Not bad! The challenge is
that you’d have to know in advance that the stock was going up, and that minutes 100 and
400 were the best times to buy and sell, respectively. It may not be possible to predict the
exact lowest highest price points, but maybe you can find relatively good times to buy and sell
throughout the day. Let’s look at a way to do this mathematically.
First we could measure whether the stock is going up or down by finding a line of “best fit”,
that approximately follows the direction the price is moving. This process is called linear
regression, and we’ll cover it in part 3 of the book. Based on the variability of data, we can
calculate two more lines above and below the “best fit” line that show the region in which the
price is wobbling up and down. Overlaid on the price graph, we see they follow the trend
nicely.

©Manning Publications Co. To comment go to liveBook 3

Figure 1.2 Using linear regression to identify the trend in a changing stock price.
With a mathematical understanding of the price movement, we could write software to
automatically buy when the price is going through a low fluctuation and automatically sell
when the price goes back up. Specifically, our program could connect to the stock exchange
over the network and buy 100 shares whenever the price crosses the bottom line and sell 100
shares whenever the price crosses the top line. One profitable trade is shown below: entering
at around $27.80 and selling at around $32.60 makes you $480 in an hour.
    `;
  const messages = [
    {
      role: "system",
      content:
        "You need to create a multiple-choice quiz based on the content provided and format it in JSON with one correct answer and a maximum of three incorrect answers for each question.",
    },
    { role: "user", content: generatePrompt(str) },
    // { role: "assistant", content: firstResponse },
    // { role: "user", content: sndPrompt },
  ];
  const sndCompletion = await openai.chat.completions.create({
    model: "ft:gpt-3.5-turbo-0613:personal::8GHsfxGO",
    messages: messages,
    temperature: 0.0,
    max_tokens: 800,
  });

  sndCompletionText = sndCompletion.choices[0].message.content;
  console.log(sndCompletionText);

  //   } else {
  //     sndCompletionText = `{
  //     "quizTitle": "Urban Playground Quiz",
  //     "questions": [
  //       {
  //         "questionTitle": "What is the atmosphere of an urban playground like?",
  //         "correct_answer": "Vibrant and dynamic",
  //         "incorrect_answers": ["Quiet and peaceful", "Loud and chaotic", "Calm and serene"]
  //       },
  //       {
  //         "questionTitle": "What type of activities can be found in an urban playground?",
  //         "correct_answer": "Art, music, and technology",
  //         "incorrect_answers": ["Sports, shopping, and dining", "Gardening, cooking, and crafting", "Hiking, biking, and swimming"]
  //       },
  //       {
  //         "questionTitle": "What type of people can be found in an urban playground?",
  //         "correct_answer": "People from all walks of life",
  //         "incorrect_answers": ["Only young people", "Only wealthy people", "Only people with a certain hobby"]
  //       },
  //       {
  //         "questionTitle": "What type of environment is an urban playground?",
  //         "correct_answer": "Bustling city",
  //         "incorrect_answers": ["Quiet countryside", "Suburban neighborhood", "Remote mountain village"]
  //       },
  //       {
  //         "questionTitle": "What is the atmosphere of an urban playground filled with?",
  //         "correct_answer": "The rhythms of diverse cultures and the aroma of street food",
  //         "incorrect_answers": ["The sound of traffic and the smell of exhaust", "The sound of birds and the smell of flowers", "The sound of waves and the smell of salt"]
  //       }
  //     ]
  //   }`;
  const sndFormattedResponse = JSON.parse(sndCompletionText); // Parse the JSON string
  console.log("sndformattedResponse: " + sndFormattedResponse);
  //   const combinedQuestions = frstResponseJSON.questions.concat(
  // sndFormattedResponse.questions
  //   );
}

// sndFormattedResponse.questions.forEach((question) => {
//   frstResponseJSON.questions.push(question);
// });

// ... (previous code)

async function main() {
  try {
    // console.log("question count: " + questions.length);
  } catch (error) {
    // console.error("An error occurred:", error);
  }
}

// main();

generateResponses();
