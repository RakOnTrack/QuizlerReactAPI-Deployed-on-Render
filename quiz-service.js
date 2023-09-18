const mongoose = require("mongoose");

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});

let mongoDBConnectionString = process.env.MONGO_URL;

// let Schema = mongoose.Schema;

const questionSchema = new mongoose.Schema({
  questionTitle: String,
  correct_answer: String,
  incorrect_answers: [String],
  isCorrect: {
    type: Boolean,
    default: false,
  },
});

const newQuizSchema = new mongoose.Schema({
  quizTitle: String,
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Questions", // Assuming 'Question' is the model name for questions
    },
  ],
  directory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory", // Reference to the Directory model
  },
  started: {
    type: Boolean,
    default: false,
  },
});

const directorySchema = new mongoose.Schema({
  name: String, // Name of the directory
  quizzes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "newQuizzes", // Reference to the Quiz model
      default: [],
    },
  ],
  subdirectories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Directory", // Reference to the Directory model itself (for subdirectories)
      default: [],
    },
  ],
  parentDirectory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory",
    default: "6508bbf7a027061a12c9c8e4", // Set the default value to null for no parent directory
  },
});

let Question;
let Quiz;
let Directory;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString);

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      Question = db.model("Questions", questionSchema);
      Quiz = db.model("newQuizzes", newQuizSchema);
      Directory = db.model("directories", directorySchema);
      resolve();
    });
  });
};

// CRUD routes:

// QUIZ ROUTES

// Create
// add quiz
module.exports.addQuiz = function (quizData) {
  return new Promise(function (resolve, reject) {
    const { quizTitle, questions, directoryId } = quizData;

    if (!quizTitle || !questions || !directoryId) {
      reject("quizTitle, questions, or directoryId not valid.");
    } else {
      // sept 18th i think i forgot to get rid of this!
      const questionsWithoutId = questions.map((question) => {
        const { _id, ...questionWithoutId } = question;
        return questionWithoutId;
      });

      Question.insertMany(questionsWithoutId)
        .then((insertedQuestions) => {
          const questionIds = insertedQuestions.map((question) => question._id);
          let newestQuiz = new Quiz({
            quizTitle,
            questions: questionIds,
            directory: directoryId,
          });

          return newestQuiz.save();
        })
        .then((savedQuiz) => {
          // Store the _id of the newly created quiz
          const savedQuizId = savedQuiz._id;

          // Add the new quiz's _id to the directory's quizzes array
          return Directory.findByIdAndUpdate(directoryId, {
            $push: { quizzes: savedQuizId },
          }).then(() => {
            return module.exports.getQuiz(savedQuizId); // Call getQuiz with the newly saved quiz ID
          });
        })
        .then((retrievedQuiz) => {
          resolve(retrievedQuiz); // Resolve with the retrieved quiz data
        })
        .catch((err) => {
          if (err.code === 11000) {
            reject("Quiz Title already taken");
          } else {
            reject("There was an error creating the quiz: " + err);
          }
        });
    }
  });
};

module.exports.addQuizWithAI = async function (req) {
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

// Read

// get all quizzes. this just gets the quizTitle, _id, number of questions, and number of correct questions
module.exports.getQuizzes = function () {
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

// eventually we'll have to make a condition where if the quiz has more than 50 questions,
// it first only add the first half, and then a second half using another call

// get a single quiz.
module.exports.getQuiz = function (quizID) {
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

// Update
// rename quiz
module.exports.renameQuiz = function (quizID, newTitle) {
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
module.exports.addQuestion = function (quizID, questionBody) {
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
module.exports.restartQuiz = function (quizID) {
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

// save study results. uses array of question IDs to change specific questions isCorrect to true
module.exports.markQuestionsCorrect = function (quizID, questionIDs) {
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

// Delete
// remove quiz
module.exports.deleteQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
    // Find the quiz by ID to get the list of question references
    Quiz.findById(quizID)
      .exec()
      .then((quiz) => {
        if (!quiz) {
          reject(`Quiz with ID ${quizID} not found.`);
          return;
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
        // resolve(
        //   `Quiz with ID ${quizID} and associated questions removed successfully.`
        // );
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

// QUESTION ROUTES

// update question
module.exports.updateQuestion = function (questionID, questionBody) {
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

// remove question.
module.exports.deleteQuestion = function (questionID) {
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

module.exports.createDirectory = function (directoryData) {
  return new Promise(async function (resolve, reject) {
    const { name, parentDirectoryId } = directoryData;

    try {
      // Create a new directory with the provided name and parent directory ID
      const newDirectory = new Directory({
        name,
        parentDirectory: parentDirectoryId, // Set the parent directory if applicable
      });

      // Save the new directory
      const savedDirectory = await newDirectory.save();

      // Update the parent directory's subdirectories array
      if (parentDirectoryId) {
        const parentDirectory = await Directory.findById(parentDirectoryId);
        if (parentDirectory) {
          parentDirectory.subdirectories.push(savedDirectory._id);
          await parentDirectory.save();
        }
      }

      resolve(savedDirectory);
    } catch (error) {
      reject("Error creating directory: " + error);
    }
  });
};

module.exports.readDirectory = function (directoryData) {
  return new Promise(function (resolve, reject) {
    const { directoryId } = directoryData;
    try {
      // Find the directory by its ID
      const directory = Directory.findById(directoryId);

      if (!directory) {
        throw new Error("Directory not found");
      }

      // Find all the quizzes in the directory
      const quizzes = Quiz.find({ directory: directoryId });

      // Find all the routes in the directory
      const routes = Directory.find({ directory: directoryId });

      return { directory, quizzes, routes };
    } catch (error) {
      throw error;
    }
  });
};
