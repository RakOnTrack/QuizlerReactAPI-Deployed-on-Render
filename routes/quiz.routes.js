const router = require("express").Router();

const quizService = require("../controllers/quiz.controller.js");

// Add quiz
router.post("/", quizService.addQuiz);
router.post("/dir/:DirId", quizService.addQuizToDir);

const multer = require("multer"); // Middleware for handling multipart/form-data
const upload = multer(); // Create an instance of multer

// Add a quiz using openai api to generate it
// router.post("/openai", upload.none(), quizService.addQuizWithAI(req.body));

// Add a quiz using openai api to generate it
router.post("/openai", upload.none(), async (req, res) => {
  quizService
    .addQuizWithAI(req.body, res)
    .then((data) => {
      res.json(data);
    })
    .catch((msg) => {
      res.status(422).json({ error: msg });
    });
});

// Get all quizzes
router.get("/", quizService.getQuizzes);

// Get specific Quiz by ID
router.get("/:id", quizService.getQuiz);

// Rename quiz using ID
router.put("/rename/:id", quizService.renameItem);

// Add question to quiz
router.put("/question/:id", quizService.addQuestion);

// Restart quiz progress
router.put("/restart/:id", quizService.restartQuiz);

// Update study results for quiz
router.put("/markCorrectAnswers/:id", quizService.markQuestionsCorrect);

// Remove quiz using its Id
router.delete("/:id", quizService.deleteQuiz);

// Update question
router.put("/questions/:questionId", quizService.updateQuestion);

// Remove question.
router.delete("/questions/:questionId", quizService.deleteQuestion);

module.exports = router;
