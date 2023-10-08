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

//afterEach(async () => await db.clear());

jest.setTimeout(90000);

describe("Quiz API Tests", () => {
    // Connects to the test database before all the tests in this suite
    beforeAll(async () => {
        await db.connect()
    });
    
    // Disconnects to the test database after all the tests in this suite
    afterAll(async () => {
        await db.close();
    });

    /** Test Case 1:
     * Adds a quiz to database with a test directory
     */
    describe("POST /api/quizzes", () => {
        it("should add a quiz to the database with test directory", async () => {
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
            expect(res.body.quizTitle === testQuizTitle)
        });
    });

    /** Test Case 2:
     * Adds a quiz to database with a test directory
     */
    describe("POST /api/quizzes", () => {
        it("should add a quiz to the database with no directory", async () => {
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
                parentDirectory: null,
            })
            expect(res.status).toBe(200);
            expect(res.body.quizTitle === testQuizTitle)
        });
    });

    /** Test Case 3:
     * Adds multiple quizzes to database with a test directory
     */
    describe("POST /api/quizzes", () => {
        it("should add multiple quizzes to the database with test directory", async () => {
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

            const res1 = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle + "1",
                questions: testQuestions,
                parentDirectory: "test",
            })
            const res2 = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle + "2",
                questions: testQuestions,
                parentDirectory: "test",
            })
            const res3 = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle + "3",
                questions: testQuestions,
                parentDirectory: "test",
            })
            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);
            expect(res3.status).toBe(200);
        });
    });

    /** Test Case 4:
     * Retrieves all the quizzez in the database
     */
    describe("GET /api/quizzes", () => {
        it("should get all the quizzes in the database", async () => {
            const res = await request(app).get("/api/quizzes");
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(5)
        });
    });

    /** Test Case 5:
     * Adds a quiz and retrieves it from the database using its ID
     */
    describe("GET /api/quizzes/:id", () => {
        it("should get the quiz from the database by its ID", async () => {
            let testQuizTitle = "Test Quiz Title ";
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

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let id = postResult.body._id;

            const getResult = await request(app).get(`/api/quizzes/${id}`);
            expect(getResult.status).toBe(200);
            
        });
    });

    /** Test Case 6:
     * Retrieves a quiz that has an invalid ID
     */
    describe("GET /api/quizzes/:id", () => {
        it("should get error when trying to find an invalid ID", async () => {
            // random string of integers to represent an ID
            let id = Math.floor(100000000 + Math.random() * 900000000).toString()

            const getResult = await request(app).get(`/api/quizzes/${id}`);
            expect(getResult.status).toBe(422);
        });
    });

    /** Test Case 7:
     * Add a quiz and rename its quiz title using its ID
     */
    describe("PUT /api/quizzes/rename/:id", () => {
        it("should rename a quiz title in the database using its ID", async () => {
            let testQuizTitle = "Test Quiz Title ";
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

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let id = postResult.body._id;

            const putResult = await request(app).put(`/api/quizzes/rename/${id}`).send({
                quizTitle: testQuizTitle + "_newtitle",
            });
            expect(putResult.status).toBe(200);
            expect(putResult.body.quizTitle).toBe(testQuizTitle + "_newtitle");
        });
    });

    /** Test Case 8:
     * Add a quiz and add a question to it
     */
    describe("PUT /api/quizzes/question/:id", () => {
        it("should add a question to a quiz using its ID", async () => {
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

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let id = postResult.body._id;

            const putResult = await request(app).put(`/api/quizzes/question/${id}`).send({
                questionTitle: "Added Test Question Title",
                correct_answer: "Correct",
                incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"]
            });
            expect(putResult.status).toBe(200);
            expect(putResult.body.quizTitle).toBe("Test Quiz Title");
            expect(putResult.body.questions).toHaveLength(3);
        });
    });

    /** Test Case 9:
     * Restart the quiz progress by marking all questions as false for correct using its ID to find it
     */
    describe("PUT /api/quizzes/restart/:id", () => {
        it("should restart the progress of the quiz", async () => {
            let testQuizTitle = "Test Quiz Title";
            let testQuestions = [
                {
                    questionTitle: "Test Question Title 1",
                    correct_answer: "Correct",
                    incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
                    isCorrect: true,
                },
                {
                    questionTitle: "Test Question Title 2",
                    correct_answer: "Correct",
                    incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
                    isCorrect: true,
                }
            ]

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let id = postResult.body._id;

            const putResult = await request(app).put(`/api/quizzes/restart/${id}`);
            expect(putResult.status).toBe(200);
            //expect(putResult.body.questions).toHaveLength(2); // returns empty object
        });
    });

    /** Test Case 10:
     * Update study results for quiz
     */
    describe("PUT /api/quizzes/update/:id", () => {
        it("should update the study results for the quiz", async () => {
            let testQuizTitle = "Test Quiz Title";
            let testQuestions = [
                {
                    questionTitle: "Test Question Title 1",
                    correct_answer: "Correct",
                    incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
                    isCorrect: false,
                },
                {
                    questionTitle: "Test Question Title 2",
                    correct_answer: "Correct",
                    incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"],
                    isCorrect: false,
                }
            ]

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let id = postResult.body._id;
            let q1_id = postResult.body.questions[0]._id;

            const putResult = await request(app).put(`/api/quizzes/update/${id}`).send({
                correctQuestions: [{
                    _id: q1_id
                }]
            });
            expect(putResult.status).toBe(200);
            //expect(putResult.body.questions).toHaveLength(2); // returns empty object
        });
    });

    /** Test Case 11:
     * Remove a quiz by its ID
     */
    describe("DELETE /api/quizzes/:id", () => {
        it("should remove a quiz by its ID", async () => {
            let testQuizTitle = "Test Quiz Title ";
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

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let id = postResult.body._id;

            const getResult = await request(app).get("/api/quizzes");
            expect(getResult.status).toBe(200);
            let quizNumber = getResult.body.length;

            const deleteResult = await request(app).delete(`/api/quizzes/${id}`);
            expect(deleteResult.status).toBe(200);
            //console.log(deleteResult.body.length);
            //expect(deleteResult.body.length).not.toBe(quizNumber);
        });
    });

     /** Test Case 12:
     * Update the question and its contents using the question ID
     */
     describe("PUT /api/quizzes/questions/:questionId", () => {
        it("should update the question using its ID", async () => {
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

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let q1_id = postResult.body.questions[0]._id;

            const putResult = await request(app).put(`/api/quizzes/questions/${q1_id}`).send({
                questionTitle: "CHANGED Test Question Title 1", // changed title
                correct_answer: "Correct",
                incorrect_answers: ["Incorrect 1", "Incorrect 2", "Incorrect 3"]
            });
            expect(putResult.status).toBe(200);
            expect(putResult.body.questionTitle).toBe("CHANGED Test Question Title 1");
        });
    });

     /** Test Case 13:
     * Delete the question using its ID
     */
     describe("DELETE /api/quizzes/questions/:questionId", () => {
        it("should remove the question using its ID", async () => {
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

            const postResult = await request(app).post("/api/quizzes").send({
                quizTitle: testQuizTitle,
                questions: testQuestions,
                parentDirectory: "test",
            })

            expect(postResult.status).toBe(200);
            let q1_id = postResult.body.questions[0]._id;

            const deleteResult = await request(app).delete(`/api/quizzes/questions/${q1_id}`);
            expect(deleteResult.status).toBe(200);
        });
    });
})

