module.exports = app => {
    const quizService = require("../controllers/quiz.controller.js");

    var router = require("express").Router();

    // Add quiz
    router.post("/", (req, res) => {
        quizService
        .addQuiz(req.body)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Add a quiz using openai api to generate it
    router.post("/openai", async (req, res) => {
        quizService
        .addQuizWithAI(req.body)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Get all quizzes
    router.get("/", (req, res) => {
        quizService
        .getQuizzes()
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Get specific Quiz by Id
    router.get("/:id", (req, res) => {
        quizService
        .getQuiz(req.params.id)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Rename quiz
    router.put("/rename/:id", (req, res) => {
        quizService
        .renameItem(req.params.id, req.body.quizTitle)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Add question to quiz
    router.put("/question/:id", (req, res) => {
        quizService
        .addQuestion(req.params.id, req.body)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Restart quiz progress
    router.put("/restart/:id", (req, res) => {
        quizService
        .restartQuiz(req.params.id)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Update study results for quiz
    router.put("/update/:id", (req, res) => {
        quizService
        .markQuestionsCorrect(req.params.id, req.body.correctQuestions)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Remove quiz using its Id
    router.delete("/:id", (req, res) => {
        quizService
        .deleteQuiz(req.params.id)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });

    // Update question
    router.put("/questions/:questionId", (req, res) => {
        quizService
        .updateQuestion(req.params.questionId, req.body)
        .then((data) => {
            res.json(data);
        })
        .catch((msg) => {
            res.status(422).json({ error: msg });
        });
    });
    
    // Remove question.
    router.delete("/questions/:questionId", (req, res) => {
        quizService
        .deleteQuestion(req.params.questionId)
        .then((updatedQuestions) => {
            res.json(updatedQuestions);
        })
        .catch((error) => {
            res.status(422).json({ error });
        });
    });

    app.use('/api/quizzes', router);
};