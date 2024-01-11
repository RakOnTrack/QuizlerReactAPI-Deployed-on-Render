var router = require("express").Router();

const directoryService = require("../controllers/directory.controller.js");

// Create a new directory
router.post(
  "/",
  directoryService.createDirectory,
  // If req.body.parentDirectoryId is falsy, and you want to ensure a default value,
  // you can explicitly set it to the default here
  // if (!req.body.parentDirectoryId) {
  //   req.body.parentDirectoryId = process.env.DEFAULT_ROOT_DIRECTORY;
  // }
);

// Read directory, going to default root directory
// router.get("/", directoryService.redirectToRoot);

// Read directory using its ID
router.get("/:id", directoryService.readDirectory);

// Moving a directory
router.put("/movedir", directoryService.moveDirectory);

// Route for moving a quiz between directories
// chloe: changed the route call since its more related to directories
router.put("/moveQuiz", directoryService.moveQuiz);

// Route for renaming a directory
router.put("/rename", directoryService.renameDirectory);

// Route for switching the order of quizzes and subdirectories
router.put("/switch-order", directoryService.switchOrder);

// Route for deleting a directory 
router.delete("/", directoryService.deleteDirectory);


module.exports = router;
