# Quizler App - Backend Repo

Node.js , Express and MongoDb App

## Running project

Download needed packages in root

`npm install`

Run the server

`npm start`

Open [http://localhost:8080](http://localhost:8080)

## Project Structure

API Calls: `server.js` -> `/routes` -> `/controllers`

`Server.js` - Running of app and connect database
`/models` - schemas and mongo model
`/routes` - server routes for API calls
`/controllers` - functions for api calls
`/tests` - test cases folder

## Running Tests

Download needed packages:

`npm i jest supertest cross-env`

Run the test folder:

`npm run test`
