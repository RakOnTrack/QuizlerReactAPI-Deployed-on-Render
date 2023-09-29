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

const quizSchema = new mongoose.Schema({
  quizTitle: String,
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question", // Assuming 'Question' is the model name for questions
    },
  ],
  parentDirectory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Directory", // Reference to the Directory model
    // never gets used :( the addQuiz function just sets it to null if theres no directory provided.
    default: process.env.DEFAULT_ROOT_DIRECTORY, // Set the default value to homeroute for no parent directory
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
      ref: "Quiz", // Reference to the Quiz model
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
    default: process.env.DEFAULT_ROOT_DIRECTORY, // Set the default value to homeroute for no parent directory
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
      Quiz = db.model("Quizzes", quizSchema);
      Directory = db.model("Directories", directorySchema);
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

    if (!quizTitle || !questions) {
      reject("quizTitle, questions, or directoryId not valid.");
    } else {
      Question.insertMany(questions)
        .then((insertedQuestions) => {
          const questionIds = insertedQuestions.map((question) => question._id);
          let newestQuiz = new Quiz({
            quizTitle,
            questions: questionIds,
          });
          // we need to do it this way because if directoryID isnt defined, then it needs to become the default value, set by the schema

          newestQuiz.directory =
            directoryId || process.env.DEFAULT_ROOT_DIRECTORY;

          // if (directoryId) {
          //   newestQuiz.directory = directoryId;
          // } else {
          //   newestQuiz.directory = process.env.DEFAULT_ROOT_DIRECTORY;
          // }

          return newestQuiz.save();
        })
        .then((savedQuiz) => {
          // Store the _id of the newly created quiz

          // Add the new quiz's _id to the directory's quizzes array
          return Directory.findByIdAndUpdate(savedQuiz.directory, {
            $push: { quizzes: savedQuiz._id },
          }).then(() => {
            return module.exports.getQuiz(savedQuiz._id); // Call getQuiz with the newly saved quiz ID
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
module.exports.renameItem = function (quizID, newTitle) {
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
      if (!name) {
        reject("please enter a name for the directory");
      }
      // Create a new directory with the provided name and parent directory ID
      const newDirectory = new Directory({
        name,
      });

      newDirectory.parentDirectory =
        parentDirectoryId || process.env.DEFAULT_ROOT_DIRECTORY; // Set the parent directory if applicable
      // Save the new directory
      const savedDirectory = await newDirectory.save();

      // Update the parent directory's subdirectories array
      // if (parentDirectoryId) {
      const parentDirectory = await Directory.findById(
        newDirectory.parentDirectory
      );
      if (parentDirectory) {
        parentDirectory.subdirectories.push(savedDirectory._id);
        await parentDirectory.save();
      }
      // }

      resolve(savedDirectory);
    } catch (error) {
      reject("Error creating directory: " + error);
    }
  });
};

module.exports.readDirectory = function (directoryId) {
  return new Promise(async function (resolve, reject) {
    try {
      // Find the directory by its ID
      const directory = await Directory.findById(directoryId);

      if (!directory) {
        throw new Error("Directory not found");
      }

      // Find all the subdirectories in the directory
      const subdirectories = await Directory.find({
        parentDirectory: directoryId,
      });
      const subdirectoryData = subdirectories.map((subdirectory) => ({
        _id: subdirectory._id,
        name: subdirectory.name,
        numberOfSubdirectories: 0, // Placeholder value to be updated below
        numberOfQuizzes: subdirectory.quizzes.length,
      }));

      // Find all the quizzes in the directory
      const quizzes = await Quiz.find({ parentDirectory: directoryId });
      const quizData = quizzes.map((quiz) => ({
        _id: quiz._id,
        quizTitle: quiz.quizTitle,
        numberOfQuestions: quiz.questions.length,
        numberOfCorrectQuestions: 0, // Placeholder value to be updated below
      }));

      // Calculate the actual number of subdirectories and correct questions
      for (const subdirectory of subdirectoryData) {
        subdirectory.numberOfSubdirectories = subdirectories.filter(
          (sub) =>
            sub.parentDirectory.toString() === subdirectory._id.toString()
        ).length;
      }

      // Return the structured data
      resolve({
        directory: {
          _id: directory._id,
          name: directory.name,
        },
        subdirectories: subdirectoryData,
        quizzes: quizData,
      });
    } catch (error) {
      reject(error); // Reject the promise with the error
    }
  });
};

//maybe in the future i can combine the moveDir and moveQuiz into 1 function.
// Function for moving a directory
module.exports.moveDirectory = function (directoryId, newParentId) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!directoryId || !newParentId) {
        reject("missing directoryID or newParentID");
      }
      const directory = await Directory.findById(directoryId);
      //client is trying to move root directory.
      if (directoryId == process.env.DEFAULT_ROOT_DIRECTORY) {
        throw new Error("Cannot move route directory.");
      }
      // invalid directory
      else if (!directory) {
        throw new Error("Directory not found");
      }
      // Get the original parent directory ID before moving.
      const originalParentId = directory.parentDirectory;

      // Update the directory's parentDirectory to the newParentId.
      directory.parentDirectory = newParentId;

      // Save the updated directory.
      await directory.save();

      // Remove the directoryId from the original parent directory's subdirectories.
      if (originalParentId) {
        const originalParentDirectory = await Directory.findById(
          originalParentId
        );
        if (originalParentDirectory) {
          originalParentDirectory.subdirectories =
            //removing the directory by only keeping subdirectories that dont match the directoryID.
            originalParentDirectory.subdirectories.filter(
              (sub) => sub.toString() !== directoryId
            );
          await originalParentDirectory.save();
        }
      }

      // Add the directoryId to the new parent directory's subdirectories.
      if (newParentId) {
        const newParentDirectory = await Directory.findById(newParentId);
        if (newParentDirectory) {
          newParentDirectory.subdirectories.push(directoryId);
          await newParentDirectory.save();
        }
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Function for renaming a directory
module.exports.renameDirectory = function (directoryId, newTitle) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!directoryId || !newTitle) {
        reject("New directory ID and new title are required.");
        return;
      }

      // Update the original directory title
      const updatedDir = await Directory.findByIdAndUpdate(
        directoryId,
        { name: newTitle },
        { new: true }
      ).exec();

      if (updatedDir) {
        resolve(updatedDir);
      } else {
        reject(`Directory with ID ${directoryId} not found.`);
      }
    } catch (error) {
      reject(error); // Propagate the error for handling in the route
    }
  });
};


// Function for switching the order of quizzes and subdirectories in a directory
module.exports.switchOrder = function (directoryId, quizIds, subdirectoryIds) {
  return new Promise(async (resolve, reject) => {
    try {
      // Find the directory by its ID
      const directory = await Directory.findById(directoryId);

      if (!directory) {
        throw new Error("Directory not found");
      }

      // Validate the request body
      if (!Array.isArray(quizIds) || !Array.isArray(subdirectoryIds)) {
        throw new Error("Invalid request body");
      }

      // Check that the arrays are the same length as the original arrays
      if (
        quizIds.length !== directory.quizzes.length ||
        subdirectoryIds.length !== directory.subdirectories.length
      ) {
        throw new Error("Arrays must be the same length as the original");
      }

      // Check that each _id in quizIds exists in the original quizzes array
      for (const quizId of quizIds) {
        if (!directory.quizzes.includes(quizId)) {
          throw new Error(
            `Quiz with ID ${quizId} not found in original quizzes`
          );
        }
      }

      // Check that each _id in subdirectoryIds exists in the original subdirectories array
      for (const subdirectoryId of subdirectoryIds) {
        if (!directory.subdirectories.includes(subdirectoryId)) {
          throw new Error(
            `Subdirectory with ID ${subdirectoryId} not found in original subdirectories`
          );
        }
      }

      // Update the order of quizzes and subdirectories
      directory.quizzes = quizIds;
      directory.subdirectories = subdirectoryIds;

      // Save the changes
      await directory.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Function for deleting a directory if it's empty
module.exports.deleteDirectory = function (directoryId) {
  return new Promise(async (resolve, reject) => {
    try {
      const directory = await Directory.findById(directoryId);

      if (!directory) {
        reject(new Error("Directory not found"));
        return;
      }

      // Implement the logic to check if the directory is empty and delete it

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Function for moving a quiz between directories
module.exports.moveQuiz = function (quizId, newDirectoryId) {
  return new Promise(async (resolve, reject) => {
    try {
      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        reject(new Error("Quiz not found"));
        return;
      }

      const newDirectory = await Directory.findById(newDirectoryId);

      if (!newDirectory) {
        reject(new Error("Target directory not found"));
        return;
      }

      const originalDirectory = await Directory.findById(quiz.directory);

      if (!originalDirectory) {
        reject(new Error("Original directory not found"));
        return;
      }

      // Implement the logic to move the quiz between directories

      await Promise.all([
        originalDirectory.save(),
        newDirectory.save(),
        quiz.save(),
      ]);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
