const OpenAI = require("openai");
const models = require("../models");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});

let Question = models.userSchema;
let Quiz = models.quizSchema;

// ==== Create ====

// add a new quiz
exports.addQuiz = async function (quizData) {
  try {
    const { quizTitle, questions, directoryId } = quizData;

    if (!quizTitle || !questions) {
      throw new Error("quizTitle or questions are not valid.");
    }

    const insertedQuestions = await Question.insertMany(questions);

    const questionIds = insertedQuestions.map((question) => question._id);

    let directoryToUse = directoryId || process.env.DEFAULT_ROOT_DIRECTORY;

    const newestQuiz = new Quiz({
      quizTitle,
      questions: questionIds,
      parentDirectory: directoryToUse,
    });

    const savedQuiz = await newestQuiz.save();

    await Directory.findByIdAndUpdate(savedQuiz.parentDirectory, {
      $push: { quizzes: savedQuiz._id },
    });

    const retrievedQuiz = await module.exports.getQuiz(savedQuiz._id);

    return retrievedQuiz;
  } catch (err) {
    if (err.code === 11000) {
      throw new Error("Quiz Title already taken");
    } else {
      throw new Error("There was an error creating the quiz: " + err.message);
    }
  }
};

// Add a new quiz using AI
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

//TODO: add details for function
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
exports.getQuizzes = function () {
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

// TODO: eventually we'll have to make a condition where if the quiz has more than 50 questions, it first only add the first half, and then a second half using another call

// get a single quiz.
exports.getQuiz = function (quizID) {
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

// ==== Update ====

// rename quiz
exports.renameItem = function (quizID, newTitle) {
  return new Promise(function (resolve, reject) {
    if (!newTitle) {
      reject("New quiz title is required.");
      return;
    }

    // Update the original quiz title
    Quiz.findByIdAndUpdate(quizID, { quizTitle: newTitle }, { new: true })
      .exec()
      .then((updatedQuiz) => {
        if (updatedQuiz) {
          resolve(updatedQuiz);
        } else {
          reject(`Quiz with ID ${quizID} not found.`);
        }
      })
      .catch((err) => {
        reject(`Error updating quiz title: ${err}`);
      });
  });
};

// add question to quiz
exports.addQuestion = function (quizID, questionBody) {
  return new Promise(function (resolve, reject) {
    const { questionTitle, correct_answer, incorrect_answers } = questionBody;

    if (!questionTitle || !correct_answer || !incorrect_answers) {
      reject("Invalid question data.");
    } else {
      // Create the new question document
      const newQuestion = new Question({
        questionTitle,
        correct_answer,
        incorrect_answers,
      });

      newQuestion
        .save() // Save the new question
        .then((savedQuestion) => {
          // Find the quiz by ID and update the questions array
          Quiz.findByIdAndUpdate(
            quizID,
            { $push: { questions: savedQuestion._id } },
            { new: true }
          )
            .exec()
            .then(() => {
              // Get the updated quiz data using getQuiz function
              return module.exports.getQuiz(quizID);
            })
            .then((updatedQuiz) => {
              resolve(updatedQuiz);
            })
            .catch((err) => {
              reject(`Unable to update questions for quiz with ID: ${quizID}`);
            });
        })
        .catch((err) => {
          reject(`Error saving new question: ${err}`);
        });
    }
  });
};

// restart quiz, sets each questions isCorrect to false
exports.restartQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
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
        return Promise.all(updatedQuestionsPromises);
      })
      .then(() => {
        resolve(`Quiz questions successfully restarted`);
      })
      .catch((err) => {
        reject(`Error restarting quiz questions: ${err}`);
      });
  });
};

// Save study results. uses array of question IDs to change specific questions isCorrect to true
exports.markQuestionsCorrect = function (quizID, questionIDs) {
  return new Promise(function (resolve, reject) {
    // Find the quiz by ID
    Quiz.findById(quizID)
      .populate("questions")
      .exec()
      .then((quiz) => {
        if (!quiz) {
          reject(`Quiz with ID ${quizID} not found`);
          return;
        }
        // Update isCorrect value for each question
        const updatePromises = questionIDs.map((questionID) => {
          const question = quiz.questions.find((q) => q._id.equals(questionID));
          if (!question) {
            return Promise.resolve(); // Skip if question not found
          }
          question.isCorrect = true;
          return question.save();
        });
        // Wait for all question updates to complete
        return Promise.all(updatePromises);
      })
      .then(() => {
        resolve("Questions marked as correct successfully");
      })
      .catch((err) => {
        reject(`Error marking questions as correct: ${err}`);
      });
  });
};

// ==== Delete ====

// Remove quiz
exports.deleteQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
    let parentDirectoryID; // Store the parent directory's ID if it exists

    // Find the quiz by ID to check if it has a parent directory
    Quiz.findById(quizID)
      .exec()
      .then((quiz) => {
        if (!quiz) {
          reject(`Quiz with ID ${quizID} not found.`);
          return;
        }

        // Check if the quiz has a parent directory
        if (quiz.directory) {
          parentDirectoryID = quiz.directory; // Store the parent directory's ID
        }

        const questionIDs = quiz.questions; // Get the list of question references

        // Delete the associated questions first
        return Question.deleteMany({ _id: { $in: questionIDs } }).exec();
      })
      .then(() => {
        // After deleting questions, remove the quiz
        return Quiz.findByIdAndRemove(quizID).exec();
      })
      .then(() => {
        if (parentDirectoryID) {
          // If the quiz had a parent directory, find and update it
          return Directory.findByIdAndUpdate(parentDirectoryID, {
            $pull: { quizzes: quizID }, // Remove the quiz ID from quizzes array
          }).exec();
        }
        return Promise.resolve(); // If no parent directory, resolve immediately
      })
      .then(() => {
        return module.exports.getQuizzes();
      })
      .then((retrievedQuiz) => {
        resolve(retrievedQuiz); // Resolve with the retrieved quiz data
      })
      .catch((err) => {
        reject(`Unable to remove quiz with ID ${quizID}: ${err}`);
      });
  });
};

// ========== QUESTION ==========

// Update question
exports.updateQuestion = function (questionID, questionBody) {
  return new Promise(function (resolve, reject) {
    const { questionTitle, correct_answer, incorrect_answers } = questionBody;

    if (!questionTitle || !correct_answer || !incorrect_answers) {
      reject("Invalid question data.");
    } else {
      Question.findById(questionID)
        .exec()
        .then((question) => {
          if (!question) {
            reject(`Question with ID ${questionID} not found.`);
            return;
          }

          // Update question properties
          question.questionTitle = questionTitle;
          question.correct_answer = correct_answer;
          question.incorrect_answers = incorrect_answers;

          // Save the updated question
          return question.save();
        })
        .then((updatedQuestion) => {
          resolve(updatedQuestion);
        })
        .catch((err) => {
          reject(`Error updating question with ID ${questionID}: ${err}`);
        });
    }
  });
};

// Remove question.
exports.deleteQuestion = function (questionID) {
  return new Promise(function (resolve, reject) {
    Question.findByIdAndRemove(questionID)
      .exec()
      .then((deletedQuestion) => {
        if (!deletedQuestion) {
          reject(`Question with ID ${questionID} not found.`);
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
        return Promise.all(savePromises);
      })
      .then(() => {
        resolve(
          `Question with ID ${questionID} deleted and removed from all quizzes.`
        );
      })
      .catch((err) => {
        reject(`Error deleting question with ID ${questionID}: ${err}`);
      });
  });
};

