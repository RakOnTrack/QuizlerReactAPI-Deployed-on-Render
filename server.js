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

const multer = require("multer");
const upload = multer(); // Create an instance of multer

// add a quiz using openai api to generate it
// Add a quiz using openai api to generate it

// doesnt work if the quizTopic is more than 2100 tokens (5500 characters.
// we should get some kind of library that counts the number of characters in the quizTopic, so the user knows how much to add/remove.
// or maybe we could use an ai model that can work with more tokens.
app.post("/api/quizzes/openai", upload.none(), async (req, res) => {
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
app.put("/api/quizzes/rename/:id", (req, res) => {
  quizService
    .renameItem(req.params.id, req.body.quizTitle)
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
  quizService
    .updateQuestion(req.params.questionId, req.body)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

// remove question.
app.delete("/api/quizzes/questions/:questionId", (req, res) => {
  quizService
    .deleteQuestion(req.params.questionId)
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
  // If req.body.parentDirectoryId is falsy, and you want to ensure a default value,
  // you can explicitly set it to the default here
  // if (!req.body.parentDirectoryId) {
  //   req.body.parentDirectoryId = process.env.DEFAULT_ROOT_DIRECTORY;
  // }
  const dirID =
    req.body.parentDirectoryId || process.env.DEFAULT_ROOT_DIRECTORY;
  quizService
    .createDirectory(req.body.name, dirID)
    .then((dir) => {
      res.json({ dir });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

//read directory, base
app.get("/api/directory", (req, res) => {
  // Assuming you want to redirect to a default directory
  const defaultDirID = process.env.DEFAULT_ROOT_DIRECTORY;

  // Redirect to the route with the default directory ID
  res.redirect(`/api/directory/${defaultDirID}`);
});

//read directory
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

// moving a directory
app.put("/api/directory/move/", async (req, res) => {
  try {
    await quizService.moveDirectory(req.body.directoryId, req.body.newParentId);
    res.json({ message: "Directory moved successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error moving directory", error: error.message });
  }
});

// Route for renaming a directory
app.put("/api/directory/rename/", (req, res) => {
  try {
    quizService.renameDirectory(req.body.directoryId, req.body.newTitle);
    res.json({ message: "Directory renamed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error renaming directory", error: error.message });
  }
});

// Route for switching the order of quizzes and subdirectories
app.put("/api/directory/switch-order/", async (req, res) => {
  try {
    await quizService.switchOrder(
      req.body.directoryId,
      req.body.newQuizIdOrder,
      req.body.newSubDirIdOrder
    );
    res.json({ message: "Order switched successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error switching order", error: error.message });
  }
});

// Route for deleting a directory if it's empty
app.delete("/api/directory/", async (req, res) => {
  try {
    await quizService.deleteDirectory(req.body.directoryId);
    res.json({ message: "Directory deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting directory", error: error.message });
  }
});

// Route for moving a quiz between directories
app.put("/api/quizzes/move/", async (req, res) => {
  try {
    await quizService.moveQuiz(req.body.quizId, req.body.newDirectoryId);
    res.json({ message: "Quiz moved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error moving quiz: ", error });
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
