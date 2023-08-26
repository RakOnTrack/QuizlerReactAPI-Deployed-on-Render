const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGO_URL;

// let Schema = mongoose.Schema;

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



let Quiz;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString);

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      Quiz = db.model("quizzez", quizSchema);
      resolve();
    });
  });
};

// CRUD routes:

// Create
// add quiz,
module.exports.addQuiz = function (quizData) {
  return new Promise(function (resolve, reject) {
    const { quizTitle, questions } = quizData;

    if (!quizTitle || !questions) {
      reject("quizTitle or questions not valid.");
    } else {
      let newQuiz = new Quiz(quizData);
      newQuiz
        .save()
        .then(() => {
          resolve("Quiz " + quizData.quizTitle + " successfully added");
        })
        .catch((err) => {
          if (err.code == 11000) {
            reject("Quiz Title already taken");
          } else {
            reject("There was an error creating the quiz: " + err);
          }
        });
    }
  });
};

// copy quiz,

module.exports.copyQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
    // Retrieve the original quiz by ID
    Quiz.findById(quizID)
      .exec()
      .then((originalQuiz) => {
        if (!originalQuiz) {
          reject(`Original quiz with ID ${quizID} not found`);
        } else {
          // Create a copy of the original quiz data
          const copiedQuizData = {
            quizTitle: originalQuiz.quizTitle + "_to_learn",
            questions: [...originalQuiz.questions],
          };

          // Create a new Quiz instance using the copied data
          const newQuiz = new Quiz(copiedQuizData);

          // Save the copied quiz
          newQuiz
            .save()
            .then(() => {
              resolve(`Quiz ${copiedQuizData.quizTitle} successfully copied`);
            })
            .catch((err) => {
              if (err.code === 11000) {
                reject("Quiz Title already taken");
              } else {
                reject("There was an error copying the quiz: " + err);
              }
            });
        }
      })
      .catch((err) => {
        reject(`Error retrieving original quiz: ${err}`);
      });
  });
};

// add question,

module.exports.addQuestion = function (quizID, questionBody) {
  return new Promise(function (resolve, reject) {
    const { questionTitle, correct_answer, incorrect_answers } = questionBody;

    if (!questionTitle || !correct_answer || !incorrect_answers) {
      reject("invalid question data.");
    } else {
      Quiz.findById(quizID)
        .exec()
        .then((quiz) => {
          if (quiz) {
            Quiz.findByIdAndUpdate(
              quizID,
              { $push: { questions: questionBody } },
              { new: true }
            )
              .exec() // should add functionality to check if the quiz already has a question with the same title.
              // or maybe i can just have my app delete the duplicated questions when its first ran
              // it might be better to do it as questions are added and quizzez are made, we'll figure it out later.
              .then((updatedQuiz) => {
                resolve(updatedQuiz.questions);
              })
              .catch((err) => {
                reject(
                  `Unable to update questions for quiz with id: ${quizID}`
                );
              });
          } else {
            reject(`Unable to update questions for quiz with id: ${quizID}`);
          }
        })
        .catch((err) => {
          reject(`Error finding quiz with id: ${quizID}`);
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
    Quiz.find({ quizTitle: { $not: /_to_learn$/ } })
      .exec()
      .then((quizzes) => {
        resolve(quizzes);
      })
      .catch((err) => {
        reject(`Unable to retrieve quizzes: ${err}`);
      });
  });
};

// get a single quiz.
module.exports.getQuiz = function (quizID) {
  return new Promise(function (resolve, reject) {
    Quiz.findById(quizID)
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
    Quiz.findById(originalQuizID)
      .exec()
      .then((quiz) => {
        if (quiz) {
          const toLearnVersionTitle = `${quiz.quizTitle}_to_learn`;

          Quiz.findOne({ quizTitle: toLearnVersionTitle })
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

    // Search for the _to_learn version of the quiz
    const toLearnVersionTitle = `${newTitle}_to_learn`;
    Quiz.findOneAndDelete({ quizTitle: toLearnVersionTitle })
      .exec()
      .then(() => {
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
      })
      .catch((err) => {
        reject(`Error deleting _to_learn version: ${err}`);
      });
  });
};

module.exports.updateQuizQuestions = function (quizID, updatedQuestions) {
  return new Promise(function (resolve, reject) {
    // Update the original quiz title
    Quiz.findByIdAndUpdate(
      quizID,
      { questions: updatedQuestions },
      { new: true }
    )
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
      Quiz.findById(quizID)
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
    Quiz.findByIdAndRemove(quizID)
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
    Quiz.findById(quizID)
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
