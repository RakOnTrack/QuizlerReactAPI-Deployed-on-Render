const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
  started: {
    type: Boolean,
    default: false,
  },
});
const quizSchema = new mongoose.Schema({
  quizTitle: String,

  questions: [
    {
      questionTitle: String,
      correct_answer: String,
      incorrect_answers: [String],
    },
  ],
});

let Question;
let Quiz;
let oldQuiz;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString);

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      oldQuiz = db.model("quizzez", quizSchema);
      Question = db.model("Questions", questionSchema);
      Quiz = db.model("newQuizzes", newQuizSchema);
      resolve();
    });
  });
};

// CRUD routes:

// Create
// add quiz,
// module.exports.addQuiz = function (quizData) {
//   return new Promise(function (resolve, reject) {
//     const { quizTitle, questions } = quizData;

//     if (!quizTitle || !questions) {
//       reject("quizTitle or questions not valid.");
//     } else {
//       let newestQuiz = new newQuiz(quizData);
//       newestQuiz
//         .save()
//         .then(() => {
//           resolve("Quiz " + quizData.quizTitle + " successfully added");
//         })
//         .catch((err) => {
//           if (err.code == 11000) {
//             reject("Quiz Title already taken");
//           } else {
//             reject("There was an error creating the quiz: " + err);
//           }
//         });
//     }
//   });
// };

// add quiz, trying for redesign!
module.exports.addQuiz = function (quizData) {
  return new Promise(function (resolve, reject) {
    const { quizTitle, questions } = quizData;

    if (!quizTitle || !questions) {
      reject("quizTitle or questions not valid.");
    } else {
      const questionsWithoutId = questions.map((question) => {
        const { _id, ...questionWithoutId } = question;
        return questionWithoutId;
      });

      Question.insertMany(questionsWithoutId)
        .then((insertedQuestions) => {
          const questionIds = insertedQuestions.map((question) => question._id);
          let newestQuiz = new Quiz({ quizTitle, questions: questionIds });
          return newestQuiz.save();
        })
        .then(() => {
          resolve("Quiz " + quizData.quizTitle + " successfully added");
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

// copy quiz,
module.exports.restartQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
    // Retrieve the original quiz by ID
    Quiz.findById(quizID)
      .populate({
        path: "questions",
        model: "Questions", // Assuming 'Question' is the model name for questions
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

// add question,
module.exports.addQuestion = function (quizID, questionBody) {
  return new Promise(function (resolve, reject) {
    const { questionTitle, correct_answer, incorrect_answers } = questionBody;

    if (!questionTitle || !correct_answer || !incorrect_answers) {
      reject("Invalid question data.");
    } else {
      // Create the new question
      Question.create(questionBody)
        .then((newQuestion) => {
          // Find the quiz by ID and update its questions array
          return Quiz.findByIdAndUpdate(
            quizID,
            { $push: { questions: newQuestion._id } },
            { new: true }
          ).exec();
        })
        .then((updatedQuiz) => {
          resolve(getQuiz(quizID)); // Calling getQuiz to return the updated quiz
        })
        .catch((err) => {
          reject(`Unable to update questions for quiz with ID: ${quizID}`);
        });
    }
  });
};


// Read
// get all quizzes
//maybe i should also make routes for loading a list of just the quiz names, and loading a specific quiz, so that
// the user doesnt have to use so much cellular data just to see the options of availale quizzez.

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

//ok this is great! and now make a condition where if the quiz has more than 50 questions,
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

// first uses quizID to retrieve the quizTitle.
// checks if there is a _to_learn version of quiz by using quizTitle to search database for quiz with title `${quiz.quizTitle}_to_learn`.
// yes: return the to_learn version of quiz
// no: return false.
module.exports.getToLearnVersion = function (originalQuizID) {
  return new Promise(function (resolve, reject) {
    oldQuiz
      .findById(originalQuizID)
      .exec()
      .then((quiz) => {
        if (quiz) {
          const toLearnVersionTitle = `${quiz.quizTitle}_to_learn`;

          oldQuiz
            .findOne({ quizTitle: toLearnVersionTitle })
            .exec()
            .then((toLearnVersion) => {
              if (toLearnVersion) {
                resolve(toLearnVersion);
              } else {
                resolve(false); // No _to_learn version found
              }
            })
            .catch((err) => {
              reject(`Error retrieving _to_learn version: ${err}`);
            });
        } else {
          reject(`Quiz with ID ${originalQuizID} not found`);
        }
      })
      .catch((err) => {
        reject(`Unable to retrieve quiz: ${err}`);
      });
  });
};

// get questions for quiz (i dont thin i need this cause the quizzez will be in the quizez questions array.)

// Update
// update quiz (dont think i need this since i have add question.) but it would be nice to update a quiz
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

module.exports.updateQuizQuestions = function (quizID, updatedQuestions) {
  return new Promise(function (resolve, reject) {
    // Update the original quiz title
    oldQuiz
      .findByIdAndUpdate(quizID, { questions: updatedQuestions }, { new: true })
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

// update question
module.exports.updateQuestion = function (quizID, questionID, questionBody) {
  return new Promise(function (resolve, reject) {
    const { questionTitle, correct_answer, incorrect_answers } = questionBody;

    if (!questionTitle || !correct_answer || !incorrect_answers) {
      reject("Invalid question data.");
    } else {
      oldQuiz
        .findById(quizID)
        .exec()
        .then((quiz) => {
          if (!quiz) {
            reject(`Quiz with id ${quizID} not found.`);
            return;
          }

          const questionToUpdate = quiz.questions.find(
            (question) => question._id.toString() === questionID
          );

          if (!questionToUpdate) {
            reject(`Question with id ${questionID} not found in the quiz.`);
            return;
          }

          // Update question properties
          questionToUpdate.questionTitle = questionTitle;
          questionToUpdate.correct_answer = correct_answer;
          questionToUpdate.incorrect_answers = incorrect_answers;

          quiz
            .save()
            .then((updatedQuiz) => {
              resolve(updatedQuiz);
            })
            .catch((err) => {
              reject(`Error updating question with id: ${questionID}`);
            });
        })
        .catch((err) => {
          reject(`Error finding quiz with id: ${quizID}`);
        });
    }
  });
};

// Delete
// remove quiz
module.exports.removeQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
    oldQuiz
      .findByIdAndRemove(quizID)
      .exec()
      .then((removedQuiz) => {
        if (removedQuiz) {
          resolve(`Quiz with ID ${quizID} removed successfully.`);
        } else {
          reject(`Quiz with ID ${quizID} not found.`);
        }
      })
      .catch((err) => {
        reject(`Unable to remove quiz with ID ${quizID}: ${err}`);
      });
  });
};

// remove question.
module.exports.removeQuestionFromQuiz = function (quizID, questionID) {
  return new Promise(function (resolve, reject) {
    oldQuiz
      .findById(quizID)
      .exec()
      .then((quiz) => {
        if (!quiz) {
          reject(`Quiz with id ${quizID} not found.`);
          return;
        }

        const questionIndex = quiz.questions.findIndex(
          (question) => question._id.toString() === questionID
        );

        if (questionIndex === -1) {
          reject(`Question with id ${questionID} not found in the quiz.`);
          return;
        }

        // Remove the question from the array
        quiz.questions.splice(questionIndex, 1);

        quiz
          .save()
          .then((updatedQuiz) => {
            resolve(updatedQuiz.questions);
          })
          .catch((err) => {
            reject(`Error removing question with id: ${questionID}`);
          });
      })
      .catch((err) => {
        reject(`Error finding quiz with id: ${quizID}`);
      });
  });
};
