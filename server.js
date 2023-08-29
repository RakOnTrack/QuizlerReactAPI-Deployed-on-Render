const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const quizService = require("./quiz-service");

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// redirect home to get all quizzes.
app.get("/", (req, res) => {
  res.redirect("/api/quizzes");
});

//get all quizzez
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
    .removeQuiz(req.params.id)
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

quizService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });
