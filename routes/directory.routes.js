module.exports = app => {

    const directories = require("../controllers/directory.controller.js");

    var router = require("express").Router();

    //create a new directory
    router.post("/", (req, res) => {
        // If req.body.parentDirectoryId is falsy, and you want to ensure a default value,
        // you can explicitly set it to the default here
        // if (!req.body.parentDirectoryId) {
        //   req.body.parentDirectoryId = process.env.DEFAULT_ROOT_DIRECTORY;
        // }
        const dirID =
        req.body.parentDirectoryId || process.env.DEFAULT_ROOT_DIRECTORY;
        directories
            .createDirectory(req.body.name, dirID)
            .then((dir) => {
                res.json({ dir });
            })
            .catch((msg) => {
                res.status(422).json({ message: msg });
            });
    });
    
    //read directory, base
    router.get("/", (req, res) => {
        // Assuming you want to redirect to a default directory
        const defaultDirID = process.env.DEFAULT_ROOT_DIRECTORY;
    
        // Redirect to the route with the default directory ID
        res.redirect(`/api/directory/${defaultDirID}`);
    });
    
    //read directory
    router.get("/:id", (req, res) => {
        directories
            .readDirectory(req.params.id)
            .then((data) => {
                res.json(data);
            })
            .catch((msg) => {
                res.status(422).json({ message: msg + " fail!" });
            });
    });
    
    // moving a directory
    router.put("/move", async (req, res) => {
        try {
            await directories.moveDirectory(req.body.directoryId, req.body.newParentId);
            res.json({ message: "Directory moved successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error moving directory", error: error.message });
        }
    });
    
    // Route for renaming a directory
    router.put("/rename", (req, res) => {
        try {
            directories.renameDirectory(req.body.directoryId, req.body.newTitle);
            res.json({ message: "Directory renamed successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error renaming directory", error: error.message });
        }
    });
    
    // Route for switching the order of quizzes and subdirectories
    router.put("/switch-order", async (req, res) => {
        try {
            await directories.switchOrder(
                req.body.directoryId,
                req.body.newQuizIdOrder,
                req.body.newSubDirIdOrder
            );
            res.json({ message: "Order switched successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error switching order", error: error.message });
        }
    });
    
    // Route for deleting a directory if it's empty
    router.delete("/", async (req, res) => {
        try {
            await directories.deleteDirectory(req.body.directoryId);
            res.json({ message: "Directory deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting directory", error: error.message });
        }
    });
    
    // Route for moving a quiz between directories
    // chloe: changed the route call since its more related to directories
    router.put("/move", async (req, res) => {
        try {
            await directories.moveQuiz(req.body.quizId, req.body.newDirectoryId);
            res.json({ message: "Quiz moved successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error moving quiz: ", error });
        }
    });

    app.use('/api/directory', router); // uses "/api/directory before other routes"
};