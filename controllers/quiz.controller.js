const OpenAI = require("openai");
const db = require("../models/index"); // retrieve mongo connection

// FIXME: store in a models file, currently breaks test cases
/* const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
}); */

let Question = db.mongoose.connection.model("Questions", require("../models/question.model"));
let Quiz = db.mongoose.connection.model("Quizzes", require("../models/quiz.model"));
let Directory = db.mongoose.connection.model("Directory", require("../models/directory.model"));

// ==== Create ====

// add a new quiz
exports.addQuiz = async (req, res) =>  {
  try {
    const { quizTitle, questions, directoryId } = req.body;

    if (!quizTitle || !questions) {
      res.status(401).json({ error: `Content is empty:` });
      return;
    }

    // Insert all the questions into database
    const insertedQuestions = await Question.insertMany(questions);

    const questionIds = insertedQuestions.map((question) => question._id || "");

    // FIXME: can directory be null?
    let directoryToUse = directoryId || process.env.DEFAULT_ROOT_DIRECTORY;

    // Initiate new quiz object with data input
    const newestQuiz = new Quiz({
      quizTitle,
      questions: questionIds,
      parentDirectory: directoryToUse,
    });

    // Save quiz into database
    const savedQuiz = await newestQuiz.save();

    // Add Quiz to a Directory
    await Directory.findByIdAndUpdate(savedQuiz.parentDirectory, {
      $push: { quizzes: savedQuiz._id },
    });
  
    // gets Quiz Id and returns that
    await getQuiz(savedQuiz._id)
      .then(data => {
        res.status(200).json(data)
      });
  } catch (err) {
    if (err.code === 11000) {
      res.status(11000).json({ error: "Quiz Title already taken" });
      return;
    } else {
      res.status(404).json({ error: "There was an error creating the quiz: " + err.message });
      return;
    }
  }
};

// FIXME: Need to fix - Add a new quiz using AI
exports.addQuizWithAI = async function (req) {
  return new Promise(async (resolve, reject) => {
    // Return a promise
    const { quizTopic, questionCount } = req;

    console.error(quizTopic);

    try {
      if (!quizTopic || quizTopic.trim().length === 0) {
        return reject({
          status: 400,
          error: "Please provide a valid quiz topic.",
        });
      }

      // Use 'await' here to asynchronously wait for the completion
      const completion = await openai.completions.create({
        model: "text-davinci-003",
        prompt: generatePrompt(quizTopic, questionCount),
        temperature: 1,
        max_tokens: 2000,
      });

      const completionText = completion.choices[0].text;
      const formattedResponse = JSON.parse(completionText); // Parse the JSON string

      // Assuming 'addQuiz' is an asynchronous function that returns a promise
      const data = await module.exports.addQuiz(formattedResponse);

      resolve(data); // Resolve with the retrieved data
    } catch (error) {
      console.error(error);
      reject({
        status: 500,
        error: "An error occurred during quiz generation.",
      });
    }
  });
};

//FIXME: Add details for function
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

// ==== Read ====

// get all quizzes. this just gets the quizTitle, _id, number of questions, and number of correct questions
exports.getQuizzes = (req, res) => {
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
      message: err.message || "Error occured retreiving all quizzes."
    });
  });
};

// TODO: eventually we'll have to make a condition where if the quiz has more than 50 questions, it first only add the first half, and then a second half using another call

// get a single quiz by ID
exports.getQuiz = (req, res) => {
  let quizID = req.params.id;
  Quiz.findById(quizID)
    .populate({
      path: "questions",
      model: "Questions", // Assuming 'Question' is the model name for questions
    })
    .exec()
    .then((quiz) => {
      if (quiz) {
        res.status(200).json(quiz);
      } else {
        res.status(404).json({ error: `Quiz with ID ${quizID} does not exist` });
      }
    })
    .catch((err) => {
      res.status(422).json({ error: `Quiz with ID ${quizID} could not be found: ${err}` });
    });
};

// ==== Update ====

// Rename quiz using ID
exports.renameItem = (req, res) => {
  let quizID = req.params.id;
  let newTitle = req.body.quizTitle;
  if (!newTitle) {
    res.status(400).json({ error: "Content is empty" });
    return;
  }

  // Update the original quiz title
  Quiz.findByIdAndUpdate(quizID, { quizTitle: newTitle }, { new: true })
    .exec()
    .then((updatedQuiz) => {
      if (updatedQuiz) {
        res.status(200).json(updatedQuiz);
      } else {
        res.status(400).json({ error: `Quiz with ID ${quizID} not found.` });
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
  let quizID = req.params.id;
  let questionBody = req.body;

  const { questionTitle, correct_answer, incorrect_answers } = questionBody;

  if (!questionTitle || !correct_answer || !incorrect_answers) {
    res.status(422).json({ error: "Invalid question data." });
    return;
  } else {
    // Create the new question document
    const newQuestion = new Question({
      questionTitle,
      correct_answer,
      incorrect_answers,
    });

    await newQuestion
      .save() // Save the new question
      .then((savedQuestion) => {
        // Find the quiz by ID and update the questions array
        Quiz.findByIdAndUpdate(
          quizID,
          { $push: { questions: savedQuestion._id } },
          { new: true }
        )
          .exec()
          .then(async () => {
            // Get the updated quiz data using getQuiz function
            await getQuiz(quizID).then((updatedQuiz) => {
              // Return the updated quiz
              res.status(200).json(updatedQuiz);
            });
          })
          .catch((err) => {
            res.status(422).json({ error: `Unable to update questions for quiz with ID: ${quizID}: ${err}` });
          });
      })
      .catch((err) => {
        res.status(422).json({ error: `Error saving new question: ${err}`});
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
      res.status(200).json(updatedQuestionsPromises)
    })
    .catch((err) => {
      res.status(422).json({ error: `Error restarting quiz questions: ${err}` });
    });
};

// Save study results. uses array of question IDs to change specific questions isCorrect to true
exports.markQuestionsCorrect = (req, res) => {
  let quizID = req.params.id;
  let questionIDs = req.body.correctQuestions;
  
  // Find the quiz by ID
  Quiz.findById(quizID)
    .populate("questions")
    .exec()
    .then((quiz) => {
      if (!quiz) {
        res.status(422).json({ error: `Quiz with ID ${quizID} not found`});
        return;
      }
      // Update isCorrect value for each question
      const updatePromises = questionIDs.map((questionID) => {
        const question = quiz.questions.find((q) => q._id.equals(questionID));
        if (!question) {
          return; // Skip if question not found
        }
        question.isCorrect = true;
        return question.save();
      });
      // Wait for all question updates to complete
      // FIXME: chloe - btw this returns an empty object, is it suppose to be like this?
      res.status(200).json(updatePromises)
    })
    .catch((err) => {
      res.status(422).json({ error: `Error marking questions as correct: ${err}`});
    });
};

// ==== Delete ====

// Remove quiz using Id
exports.deleteQuiz = (req, res) => {
  let quizID = req.params.id;

  let parentDirectoryID; // Store the parent directory's ID if it exists

  // Find the quiz by ID to check if it has a parent directory
  Quiz.findById(quizID)
    .exec()
    .then((quiz) => {
      if (!quiz) {
        res.status(422).json({ error: `Quiz with ID ${quizID} not found.`});
        return;
      }

      // Check if the quiz has a parent directory
      if (quiz.directory) {
        parentDirectoryID = quiz.directory; // Store the parent directory's ID
      }

      const questionIDs = quiz.questions; // Get the list of question references

      // Delete the associated questions first
      Question.deleteMany({ _id: { $in: questionIDs } }).exec();
    })
    .then(() => {
      // After deleting questions, remove the quiz
      Quiz.findByIdAndRemove(quizID).exec();
    })
    .then(() => {
      if (parentDirectoryID) {
        // If the quiz had a parent directory, find and update it
        Directory.findByIdAndUpdate(parentDirectoryID, {
          $pull: { quizzes: quizID }, // Remove the quiz ID from quizzes array
        }).exec();
      }
    })
    .then(() => {
      // FIXME: Does not actually delete the quiz, it still returns the same amount of total quizzes
      getQuizzes().then((retrievedQuiz) => {
        res.status(200).json(retrievedQuiz);
      });
    })
    .catch((err) => {
      res.status(422).json({ error: `Unable to remove quiz with ID ${quizID}: ${err}`});
    });
};

// ========== QUESTION ==========

// Update question
exports.updateQuestion = (req, res) => {
  let questionID = req.params.questionId;
  let questionBody = req.body;

  const { questionTitle, correct_answer, incorrect_answers } = questionBody;

  if (!questionTitle || !correct_answer || !incorrect_answers) {
    res.status(422).json({ error: "Invalid question data."});
    return;
  } else {
    Question.findById(questionID)
      .exec()
      .then((question) => {
        if (!question) {
          res.status(422).json({ error: `Question with ID ${questionID} not found.`});
          return;
        }

        // Update question properties
        question.questionTitle = questionTitle;
        question.correct_answer = correct_answer;
        question.incorrect_answers = incorrect_answers;

        // Save the updated question
        question.save().then((updatedQuestion) => {
          res.status(200).json(updatedQuestion)
        });
      })
      .catch((err) => {
        res.status(422).json({ error: `Error updating question with ID ${questionID}: ${err}` });
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
        res.status(422).json({ error: `Question with ID ${questionID} not found.`});
        return;
      }

      // Remove the question reference from all quizzes
      return Quiz.updateMany(
        { questions: questionID },
        { $pull: { questions: questionID } }
      ).exec();
    })
    .then(() => {
      // Fetch the updated quizzes and save them to persist the changes
      return Quiz.find({ questions: questionID }).exec();
    })
    .then((quizzes) => {
      const savePromises = quizzes.map((quiz) => quiz.save());
      //FIXME: Returns an empty object
      res.status(200).json(savePromises)
    })
    .catch((err) => {
      res.status(422).json({ error: `Error deleting question with ID ${questionID}: ${err}` });
    });
};

// ==== INTERNAL FUNCTIONS ====

// get a single quiz.
function getQuiz(quizID) {
  return new Promise(function (resolve, reject) {
    Quiz.findById(quizID)
      .populate({
        path: "questions",
        model: "Questions", // Assuming 'Question' is the model name for questions
      })
      .exec()
      .then((quiz) => {
        if (quiz) {
          resolve(quiz);
        } else {
          reject(`Quiz with ID ${quizID} not found`);
        }
      })
      .catch((err) => {
        reject(`Unable to retrieve quiz: ${err}`);
      });
  });
};

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
};