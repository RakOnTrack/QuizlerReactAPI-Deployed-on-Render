module.exports = app => {

    const directories = require("../controllers/directory.controller.js");

    var router = require("express").Router();

    //create a new directory
    router.post("/", directories.createDirectory
        // If req.body.parentDirectoryId is falsy, and you want to ensure a default value,
        // you can explicitly set it to the default here
        // if (!req.body.parentDirectoryId) {
        //   req.body.parentDirectoryId = process.env.DEFAULT_ROOT_DIRECTORY;
        // }
    );
    
    //read directory, going to default root directory
    router.get("/", res.redirect(`/${process.env.DEFAULT_ROOT_DIRECTORY}`));
    
    // Read directory using its ID
    router.get("/:id", directories.readDirectory);
    
    // moving a directory
    router.put("/move", directories.moveDirectory);
    
    // Route for renaming a directory
    router.put("/rename", directories.renameDirectory);
    
    // Route for switching the order of quizzes and subdirectories
    router.put("/switch-order", directories.switchOrder);
    
    // Route for deleting a directory if it's empty
    router.delete("/", directories.deleteDirectory);
    
    // Route for moving a quiz between directories
    // chloe: changed the route call since its more related to directories
    router.put("/move", directories.moveQuiz);

    module.exports = router;
};