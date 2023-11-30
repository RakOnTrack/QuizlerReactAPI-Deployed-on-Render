const mongoose = require("mongoose");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const db = require("./models");
const quizRoutes = require("./routes/quiz.routes.js");
const directoryRoutes = require("./routes/directory.routes.js");

app.use(cors()); // go through cors policy for requests

app.use(express.json()); // parse in json format

app.use(express.urlencoded({ extended: true })); // parse requests application/x-www-form-urlencoded

// redirect home to get all quizzes.
app.get("/", (req, res) => {
  res.json({ message: "Quizler App" });
});

app.use("/api/quizzes", quizRoutes);
app.use("/api/directory", directoryRoutes);
//require("./routes/user.routes")(app);

const HTTP_PORT = process.env.PORT || 8080;

let database_uri = process.env.MONGO_URL;

db.mongoose
  .connect(database_uri)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("Unable to start the server: " + err);
    process.exit();
  });
