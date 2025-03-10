const OpenAI = require("openai");
const db = require("../models/index"); // retrieve mongo connection
require("dotenv").config();
// FIXME: store in a models file, currently breaks test cases
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});
const { generateQuiz } = require("./quizGenerator");

let Question = db.mongoose.connection.model(
  "Questions",
  require("../models/question.model"),
);
let Quiz = db.mongoose.connection.model(
  "Quizzes",
  require("../models/quiz.model"),
);
let Directory = db.mongoose.connection.model(
  "Directory",
  require("../models/directory.model"),
);

// ==== Create ====

// add a new quiz
exports.addQuiz = async (req, res) => {
  try {
    const { quizTitle, questions, directoryId } = req.body;

    if (!quizTitle || !questions) {
      res.status(401).json({ error: "Content is empty" });
      return;
    }

    // Ensure each question in questions has a questionTitle
    let i = 0;
    questions.forEach((question) => {
      if (!question.questionTitle) {
        res
          .status(401)
          .json({ error: "Question #" + i + " doesnt  have a title." });
        return;
      }
      i++;
    });

    // Insert all the questions into the database
    const insertedQuestions = await Question.insertMany(questions);

    const questionIds = insertedQuestions.map((question) => question._id || "");

    // Determine the directory to use
    let directoryToUse = directoryId || process.env.DEFAULT_ROOT_DIRECTORY;

    // Create a new quiz object with input data
    const newestQuiz = new Quiz({
      quizTitle,
      questions: questionIds,
      parentDirectory: directoryToUse,
    });

    // Save the quiz into the database
    const savedQuiz = await newestQuiz.save();

    //allow the quiz to have no directory.
    if (!process.env.NODE_ENV != "test" && directoryId != null) {
      // return res.status(200).json(savedDirectory);
      // Find and update the directory to add the quiz ID to the 'quizzes' array
      const directory = await Directory.findById(savedQuiz.parentDirectory);

      if (!directory) {
        res.status(404).json({ error: "Directory not found" });
        return;
      }

      directory.quizzes.push(savedQuiz._id);

      // Save the updated directory
      await directory.save();
    }

    // Get the Quiz ID and return it in the response
    await exports.getQuiz({ id: savedQuiz._id }, res);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Quiz Title already taken" });
    } else {
      res.status(500).json({
        error: "There was an error creating the quiz: " + err.message,
      });
    }
  }
};

// TODO: eventually we'll have to make a condition where if the quiz has more than 50 questions, it first only add the first half, and then a second half using another call

// Assuming you're inside an asynchronous function or using top-level await in Node.js
exports.getQuiz = async (req, res) => {
  try {
    let quizId = req.id || req.params.id;

    const quiz = await Quiz.findById(quizId)
      .populate({
        path: "questions",
        model: "Questions",
      })
      .exec();

    if (quiz) {
      // Send response here
      res.status(200).json(quiz);
      return;
    } else {
      // Send response here
      res.status(404).json({ error: `Quiz with ID ${quizId} does not exist` });
    }
  } catch (error) {
    // Handle any errors that occurred during the asynchronous operations
    // console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// FIXME: Need to fix - Add a new quiz using AI
exports.addQuizWithAI = async function (req, res) {
  // return new Promise(async (resolve, reject) => {
  // Return a promise
  const { quizTopic, questionCount, directoryId } = req;

  console.error(quizTopic);

  try {
    if (!quizTopic || quizTopic.trim().length === 0) {
      return reject({
        status: 400,
        error: "Please provide a valid quiz topic.",
      });
    }

    //can work with 6k TOKENS! :)
    const generatedQuiz = await generateQuiz(quizTopic, questionCount);

    // const formattedResponse = JSON.parse(generatedQuiz); // Parse the JSON string
    generatedQuiz.directoryId =
      directoryId || process.env.DEFAULT_ROOT_DIRECTORY; // set parentDirectory ()

    // Assuming 'addQuiz' is an asynchronous function that returns a promise
    let dataArg = {
      body: generatedQuiz,
    };

    await exports.addQuiz(dataArg, res);
    return;
    // console.log(data);
    // resolve(data); // Resolve with the retrieved data
  } catch (error) {
    console.error(error);
    reject({
      status: 500,
      error: "An error occurred during quiz generation:." + error,
    });
  }
  // });
};

// add a new quiz and add it to a directory
exports.addQuizToDir = async (req, res) => {
  try {
    // Extract the directory ID from the URL parameters
    const directoryId = req.params.DirId;
    if (!directoryId) {
      res
        .status(400)
        .json({ error: "Directory ID is missing in the URL parameter" });
      return;
    }

    // Modify the request body to include the directoryId
    req.body.directoryId = directoryId;

    // Forward the modified request to the addQuiz function
    await exports.addQuiz(req, res);
  } catch (err) {
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
};

// //FIXME: Add details for function
// function generatePrompt(studyContent, questionCount = 5) {
//   return `
//   Make me a multiple-choice quiz with ${questionCount} questions about this content:

//   ${studyContent}.

//   The quiz should be in this JSON format:

//   {
//     "quizTitle": STRING,
//     "questions": [
//       {
//         "questionTitle": "",
//         "correct_answer": "",
//         "incorrect_answers": []
//       },
//       ...
//     ]
//   }
// `;
// }

// ==== Read ====

// jfjn?title=""
// get all quizzes. this just gets the quizTitle, _id, number of questions, and number of correct questions
exports.getQuizzes = (req, res) => {
  if (req.query.quizTitle) {
    // removes the double quotation mark
    let searchQuery = req.query.quizTitle.replace(/["]+/g, "");

    // Use aggregation to filter quizzes by quizTitle
    Quiz.aggregate([
      {
        $match: {
          quizTitle: {
            $regex: new RegExp(searchQuery, "i"), // Case-insensitive search
          },
        },
      },
      {
        $lookup: {
          from: "questions", // The name of the questions collection
          localField: "questions",
          foreignField: "_id",
          as: "questionsData",
        },
      },
      {
        $project: {
          _id: 1,
          quizTitle: 1,
          numberOfQuestions: { $size: "$questionsData" }, // Count questions
          numberOfCorrectQuestions: {
            $size: {
              $filter: {
                input: "$questionsData",
                as: "question",
                cond: { $eq: ["$$question.isCorrect", true] }, // Count isCorrect = true
              },
            },
          },
        },
      },
    ])
      .exec()
      .then((quizzes) => {
        // returns the search result
        res.status(200).json(quizzes);
      })
      .catch(() => {
        // no item returns? So just returns an empty
        res.status(250).json({});
      });
    return;
  } else {
    Quiz.aggregate([
      {
        $lookup: {
          from: "questions", // The name of the questions collection
          localField: "questions",
          foreignField: "_id",
          as: "questionsData",
        },
      },
      {
        $project: {
          _id: 1,
          quizTitle: 1,
          numberOfQuestions: { $size: "$questionsData" }, // Count questions
          numberOfCorrectQuestions: {
            $size: {
              $filter: {
                input: "$questionsData",
                as: "question",
                cond: { $eq: ["$$question.isCorrect", true] }, // Count isCorrect = true
              },
            },
          },
        },
      },
    ])
      .exec()
      .then((quizzes) => {
        res.status(200).json(quizzes);
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Error occured retreiving all quizzes.",
        });
      });
  }
};

// ==== Update ====

// Rename quiz using ID
exports.renameItem = (req, res) => {
  let quizId = req.params.id;
  let newTitle = req.body.quizTitle;
  if (!newTitle) {
    res.status(400).json({ error: "Content is empty" });
    return;
  }

  // Update the original quiz title
  Quiz.findByIdAndUpdate(quizId, { quizTitle: newTitle }, { new: true })
    .exec()
    .then((updatedQuiz) => {
      if (updatedQuiz) {
        res.status(200).json(updatedQuiz);
      } else {
        res.status(400).json({ error: `Quiz with ID ${quizId} not found.` });
        return;
      }
    })
    .catch((err) => {
      res.status(400).json({ error: `Error updating quiz title: ${err}` });
      return;
    });
};

// Add question to quiz
exports.addQuestion = async (req, res) => {
  let quizId = req.params.id || req.params.quizId;
  let questionBody = req.body;

  const { questionTitle, incorrect_answers, correct_answer } = questionBody;

  if (!questionTitle || !incorrect_answers || !correct_answer) {
    res.status(422).json({ error: "Invalid question data." });
    return;
  } else {
    // Create the new question document
    const newQuestion = new Question({
      questionTitle,
      incorrect_answers,
      correct_answer,
    });

    await newQuestion
      .save() // Save the new question
      .then((savedQuestion) => {
        // Find the quiz by ID and update the questions array
        Quiz.findByIdAndUpdate(
          quizId,
          { $push: { questions: savedQuestion._id } },
          { new: true },
        )
          .exec()
          .then(async () => {
            // Get the updated quiz data using getQuiz function
            await exports.getQuiz({ id: quizId }, res);
            // });
          })
          .catch((err) => {
            res.status(422).json({
              error: `Unable to update questions for quiz with ID: ${quizId}: ${err}`,
            });
          });
      })
      .catch((err) => {
        res.status(422).json({ error: `Error saving new question: ${err}` });
      });
  }
};

// Restart quiz, sets each questions isCorrect to false
exports.restartQuiz = (req, res) => {
  let quizID = req.params.id;

  // Retrieve the original quiz by ID
  Quiz.findById(quizID)
    .populate({
      path: "questions",
      model: "Questions",
    }) // Populate questions to update them
    .exec()
    .then((quiz) => {
      // Update each question's isCorrect field to false
      const updatedQuestionsPromises = quiz.questions.map((question) => {
        question.isCorrect = false;
        return question.save(); // Save each modified question
      });

      // Wait for all question saves to complete
      // FIXME: chloe - btw this returns an empty object, is it suppose to be like this?
      res.status(200).json(updatedQuestionsPromises);
    })
    .catch((err) => {
      res
        .status(422)
        .json({ error: `Error restarting quiz questions: ${err}` });
    });
};

// Save study results. uses array of question IDs to change specific questions isCorrect to true
exports.markQuestionsCorrect = async (req, res) => {
  let quizID = req.params.id;
  let questionIDs = req.body.correctQuestions;

  try {
    const quiz = await Quiz.findById(quizID).populate("questions").exec();

    if (!quiz) {
      return res
        .status(422)
        .json({ error: `Quiz with ID ${quizID} not found` });
    }

    for (const questionID of questionIDs) {
      const question = quiz.questions.find((q) => q._id.equals(questionID));
      if (question) {
        question.isCorrect = true;
        await question.save();
      }
    }

    res.status(200).json({ message: "Questions updated successfully" });
  } catch (err) {
    res
      .status(422)
      .json({ error: `Error marking questions as correct: ${err}` });
  }
};

// ==== Delete ====

// Remove quiz using Id
exports.deleteQuiz = async (req, res) => {
  const quizID = req.params.id;

  try {
    // Find the quiz by ID
    const quiz = await Quiz.findById(quizID).exec();
    if (!quiz) {
      return res
        .status(422)
        .json({ error: `Quiz with ID ${quizID} not found.` });
    }

    // Store the parent directory's ID if it exists
    const parentDirectoryID = quiz.parentDirectory ? quiz.directory : null;

    // Get the list of question references
    const questionIDs = quiz.questions;

    // Delete the associated questions
    await Question.deleteMany({ _id: { $in: questionIDs } }).exec();

    // Remove the quiz
    await Quiz.findByIdAndRemove(quizID).exec();

    if (parentDirectoryID) {
      // If the quiz had a parent directory, update it
      await Directory.findByIdAndUpdate(parentDirectoryID, {
        $pull: { quizzes: quizID },
      }).exec();
    }

    // Respond with success
    res
      .status(200)
      .json({ message: `Quiz with ID ${quizID} successfully deleted.` });
  } catch (err) {
    // Handle any errors
    res
      .status(500)
      .json({ error: `Unable to remove quiz with ID ${quizID}: ${err}` });
  }
};

// ========== QUESTION ==========

// Update question
exports.updateQuestion = (req, res) => {
  let questionID = req.params.questionId;
  let questionBody = req.body;

  const { questionTitle, correct_answer, incorrect_answers } = questionBody;

  if (!questionTitle || !correct_answer || !incorrect_answers) {
    res.status(422).json({ error: "Invalid question data." });
    return;
  } else {
    Question.findById(questionID)
      .exec()
      .then((question) => {
        if (!question) {
          res
            .status(422)
            .json({ error: `Question with ID ${questionID} not found.` });
          return;
        }

        // Update question properties
        question.questionTitle = questionTitle;
        question.correct_answer = correct_answer;
        question.incorrect_answers = incorrect_answers;

        // Save the updated question
        question.save().then((updatedQuestion) => {
          res.status(200).json(updatedQuestion);
        });
      })
      .catch((err) => {
        res.status(422).json({
          error: `Error updating question with ID ${questionID}: ${err}`,
        });
      });
  }
};

// Remove question.
exports.deleteQuestion = (req, res) => {
  let questionID = req.params.questionId;

  Question.findByIdAndRemove(questionID)
    .exec()
    .then((deletedQuestion) => {
      if (!deletedQuestion) {
        res
          .status(422)
          .json({ error: `Question with ID ${questionID} not found.` });
        return;
      }

      // Remove the question reference from all quizzes
      return Quiz.updateMany(
        { questions: questionID },
        { $pull: { questions: questionID } },
      ).exec();
    })
    .then(() => {
      // Fetch the updated quizzes and save them to persist the changes
      return Quiz.find({ questions: questionID }).exec();
    })
    .then((quizzes) => {
      const savePromises = quizzes.map((quiz) => quiz.save());
      //FIXME: Returns an empty object
      res.status(200).json(savePromises);
    })
    .catch((err) => {
      res.status(422).json({
        error: `Error deleting question with ID ${questionID}: ${err}`,
      });
    });
};

// ==== INTERNAL FUNCTIONS ====

// Get all the quizzes
function getQuizzes() {
  return new Promise(function (resolve, reject) {
    Quiz.aggregate([
      {
        $lookup: {
          from: "questions", // The name of the questions collection
          localField: "questions",
          foreignField: "_id",
          as: "questionsData",
        },
      },
      {
        $project: {
          _id: 1,
          quizTitle: 1,
          numberOfQuestions: { $size: "$questionsData" }, // Count questions
          numberOfCorrectQuestions: {
            $size: {
              $filter: {
                input: "$questionsData",
                as: "question",
                cond: { $eq: ["$$question.isCorrect", true] }, // Count isCorrect = true
              },
            },
          },
        },
      },
    ])
      .exec()
      .then((quizzes) => {
        resolve(quizzes);
      })
      .catch((err) => {
        reject(`Unable to retrieve quizzes: ${err}`);
      });
  });
}
