// Test calls for quiz API calls

const request = require("supertest");
const express = require('express');
const db = require("./database");
const quiz_routes = require("../routes/quiz.routes.js");

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

app.use('/api/quizzes', quiz_routes);

//const agent = request.agent(app);

describe("Quiz API Tests", () => {
    beforeAll(async () => {
        await db.connect()
    });
    
    //afterEach(async () => await db.clear()); // temporary, can remove if separate tests but mainly want it for grouping tests together
    
    afterAll(async () => {
        await db.close();
    });

    /** Test Case 1:
     * Adds a quiz to database, has no directory
     */
    describe("POST /api/quizzes", () => {
        it("should add a quiz to the database", async () => {
            let testQuizTitle = "Test Quiz Title";
            let testQuestions = [
                {
                    questionTitle: "Test Question Title 1",
                    correct_answer: "Correct",
                    incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"]
                },
                {
                    questionTitle: "Test Question Title 2",
                    correct_answer: "Correct",
                    incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"]
                }
            ]

            const res = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })
            expect(res.status).toBe(200);
        }, 70000);
    });
}, 70000)

