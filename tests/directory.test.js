// Test calls for directory API calls

const request = require("supertest");
const express = require('express');
const db = require("./database");
/* const app = require("./quiz.test"); */
const directory_routes = require("../routes/directory.routes.js");

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

app.use('/api/directory', directory_routes);

jest.setTimeout(90000);

describe("Directory API Tests", () => {
    // Connects to the test database before all the tests in this suite
    beforeAll(async () => {
        await db.connect()
    });
    
    // Disconnects to the test database after all the tests in this suite
    afterAll(async () => {
        await db.close();
    });

    /** Test Case 1:
     * Creates a directory given a title name, no duplicates
     */
    describe("POST /api/directory", () => {
        it("should create a directory, no sub or parent directory", async () => {
            let testDirectoryTitle = "Test Directory Title";

            const postResult = await request(app).post("/api/directory").send({
                name: testDirectoryTitle,
                parentDirectoryId: null
            })
            //expect(postResult.status).toBe(200);
            console.log(postResult.status);
        });
    });

    /** Test Case 2:
     * Creates a directory given a title name, there is a duplicate
     */
    describe("POST /api/directory", () => {
        it("should create a directory, has a parent directory", async () => {
            let testDirectoryTitle = "Test Directory Title";

            const postResult = await request(app).post("/api/directory").send({
                name: testDirectoryTitle,
                parentDirectoryId: "testId"
            })
            //expect(postResult.status).toBe(200);
            console.log(postResult.status);
        });
    });
})