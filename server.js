const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const quizService = require("./quiz-service");
const userService = require("./user-service");

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// redirect home to get all quizzes.
app.get("/", (req, res) => {
  res.redirect("/api/quizzes");
});

//add quiz
app.post("/api/quizzes/", (req, res) => {
  quizService
    .addQuiz(req.body)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

// add a quiz using openai api to generate it
app.post("/api/quizzes/openai", async (req, res) => {
  quizService
    .addQuizWithAI(req.body)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

//get all quizzes
app.get("/api/quizzes", (req, res) => {
  quizService
    .getQuizzes()
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

//get specific Quiz
app.get("/api/quizzes/:id", (req, res) => {
  quizService
    .getQuiz(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

//rename quiz
app.put("/api/quizzes/:id", (req, res) => {
  quizService
    .renameQuiz(req.params.id, req.body.quizTitle)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

//add question to quiz
app.put("/api/quizzes/question/:id", (req, res) => {
  quizService
    .addQuestion(req.params.id, req.body)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

//restart quiz
app.put("/api/quizzes/restart/:id", (req, res) => {
  quizService
    .restartQuiz(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

// update study results
app.put("/api/quizzes/update/:id", (req, res) => {
  quizService
    .markQuestionsCorrect(req.params.id, req.body.correctQuestions)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

// remove quiz
app.delete("/api/quizzes/:id", (req, res) => {
  quizService
    .deleteQuiz(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

//update question
app.put("/api/quizzes/questions/:questionId", (req, res) => {
  const quizId = req.params.quizId;
  const questionId = req.params.questionId;

  quizService
    .updateQuestion(questionId, req.body)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

// remove question.
app.delete("/api/quizzes/questions/:questionId", (req, res) => {
  const quizId = req.params.quizId;
  const questionId = req.params.questionId;

  quizService
    .deleteQuestion(questionId)
    .then((updatedQuestions) => {
      res.json(updatedQuestions);
    })
    .catch((error) => {
      res.status(422).json({ error });
    });
});

// app.post("/api/user/register", (req, res) => {
//   userService
//     .registerUser(req.body)
//     .then((msg) => {
//       res.json({ message: msg });
//     })
//     .catch((msg) => {
//       res.status(422).json({ message: msg });
//     });
// });

// app.post("/api/user/login", (req, res) => {
//   userService
//     .checkUser(req.body)
//     .then((user) => {
//       res.json({ message: "login successful" });
//     })
//     .catch((msg) => {
//       res.status(422).json({ message: msg });
//     });
// });

//create a new directory
app.post("/api/directory", (req, res) => {
  quizService
    .createDirectory(req.body)
    .then((dir) => {
      res.json({ message: "created dir successful" });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.get("/api/directory", (req, res) => {
  // Assuming you want to redirect to a default directory
  const defaultDirID = process.env.DEFAULT_ROOT_DIRECTORY;

  // Redirect to the route with the default directory ID
  res.redirect(`/api/directory/${defaultDirID}`);
});

app.get("/api/directory/:id", (req, res) => {
  quizService
    .readDirectory(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ message: msg + " fail!" });
    });
});




// Route for moving a directory
app.put("/api/directory/move/:directoryId/:newParentId", async (req, res) => {
  try {
    await quizService.moveDirectory(req.params.directoryId, req.params.newParentId);
    res.json({ message: "Directory moved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error moving directory", error: error.message });
  }
});

// Route for renaming a directory
app.put("/api/directory/rename/:directoryId", async (req, res) => {
  try {
    await quizService.renameDirectory(req.params.directoryId, req.body.newName);
    res.json({ message: "Directory renamed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error renaming directory", error: error.message });
  }
});

// Route for switching the order of quizzes and subdirectories
app.put("/api/directory/switch-order/:directoryId", async (req, res) => {
  try {
    await quizService.switchOrder(req.params.directoryId, req.body.orderArray);
    res.json({ message: "Order switched successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error switching order", error: error.message });
  }
});

// Route for deleting a directory if it's empty
app.delete("/api/directory/:directoryId", async (req, res) => {
  try {
    await quizService.deleteDirectory(req.params.directoryId);
    res.json({ message: "Directory deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting directory", error: error.message });
  }
});

// Route for moving a quiz between directories
app.put("/api/quiz/move/:quizId/:newDirectoryId", async (req, res) => {
  try {
    await quizService.moveQuiz(req.params.quizId, req.params.newDirectoryId);
    res.json({ message: "Quiz moved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error moving quiz", error: error.message });
  }
});









// app.get("/api/user/favourites", (req, res) => {
//   userService
//     .getFavourites(req.user._id)
//     .then((data) => {
//       res.json(data);
//     })
//     .catch((msg) => {
//       res.status(422).json({ error: msg });
//     });
// });

// app.put("/api/user/favourites/:id", (req, res) => {
//   userService
//     .addFavourite(req.user._id, req.params.id)
//     .then((data) => {
//       res.json(data);
//     })
//     .catch((msg) => {
//       res.status(422).json({ error: msg });
//     });
// });

// app.delete("/api/user/favourites/:id", (req, res) => {
//   userService
//     .removeFavourite(req.user._id, req.params.id)
//     .then((data) => {
//       res.json(data);
//     })
//     .catch((msg) => {
//       res.status(422).json({ error: msg });
//     });
// });

// app.get("/api/user/history", (req, res) => {
//   userService
//     .getHistory(req.user._id)
//     .then((data) => {
//       res.json(data);
//     })
//     .catch((msg) => {
//       res.status(422).json({ error: msg });
//     });
// });

// app.put("/api/user/history/:id", (req, res) => {
//   userService
//     .addHistory(req.user._id, req.params.id)
//     .then((data) => {
//       res.json(data);
//     })
//     .catch((msg) => {
//       res.status(422).json({ error: msg });
//     });
// });

// app.delete("/api/user/history/:id", (req, res) => {
//   userService
//     .removeHistory(req.user._id, req.params.id)
//     .then((data) => {
//       res.json(data);
//     })
//     .catch((msg) => {
//       res.status(422).json({ error: msg });
//     });
// });

Promise.all([quizService.connect(), userService.connect()])
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("Unable to start the server: " + err);
    process.exit();
  });
