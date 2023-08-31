const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const quizService = require("./quiz-service");


const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});

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

function generatePrompt(studyTopic, questionCount) {
  return `
  Make me a multiple-choice quiz with ${questionCount} questions about ${studyTopic}. The quiz should be in this JSON format:

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

// Define a route to generate the quiz
app.post("/api/quizzes/openai", async (req, res) => {
  const { quizTopic, questionCount } = req.body;

  console.error(quizTopic);
  try {
    if (!quizTopic || quizTopic.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide a valid quiz topic." });
    }

    const completion = await openai.completions.create({
      model: "text-davinci-003",
      prompt: generatePrompt(quizTopic, questionCount),
      temperature: 1,
      max_tokens: 2000,
    });

    const completionText = completion.choices[0].text;
    const formattedResponse = JSON.parse(completionText); // Parse the JSON string

    // quizService.addQuiz using formattedResponse as quizData.
    quizService
      .addQuiz(formattedResponse)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred during quiz generation." });
  }
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
