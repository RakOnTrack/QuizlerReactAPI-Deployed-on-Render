const db = require("../models/index"); // retrieve mongo connection

let Quiz = db.mongoose.connection.model(
  "Quizzes",
  require("../models/quiz.model")
);
let Directory = db.mongoose.connection.model(
  "Directory",
  require("../models/directory.model")
);
// let User = db.mongoose.connection.model(
//   "User",
//   require("../models/user.model")
// );

// Creating a new directory
exports.createDirectory = async (req, res) => {
  let name = req.body.name;
  let isRoot = req.body.isRoot || false;
  let parentDirectoryId = req.body.isRoot
    ? null
    : req.body.parentDirectoryId || process.env.DEFAULT_ROOT_DIRECTORY;

  // try {
  //   // Rest of the code remains the same
  //   // ...
  // }

  // let parentDirectoryId =  req.body.parentDirectoryId || process.env.DEFAULT_ROOT_DIRECTORY;

  try {
    if (!name) {
      return res
        .status(400)
        .json({ error: "Please enter a name for the directory" });
    }

    // Create a new directory with the provided name and parent directory ID
    const newDirectory = new Directory({
      name,
      parentDirectory: parentDirectoryId,
    });

    // Save the new directory
    const savedDirectory = await newDirectory.save();

    if (!savedDirectory) {
      return res.status(500).json({ error: "Failed to save the directory" });
    }

    // Update the parent directory's subdirectories array
    if (parentDirectoryId && !isRoot) {
      const parentDirectory = await Directory.findById(parentDirectoryId);
      if (parentDirectory) {
        parentDirectory.subdirectories.push(savedDirectory._id);
        await parentDirectory.save();
      }
    }

    // If this is a test environment and there's no root directory, return the directory details
    // if (
    //   process.env.NODE_ENV === "test" &&
    //   //allow this to be the root directory, for now at least.
    //   req.body.parentDirectoryId === null
    // ) {
    //   return res.status(200).json(savedDirectory);
    // }

    // Send a success response
    if (isRoot) {
      return savedDirectory;
    }
    return res.status(200).json(savedDirectory);
  } catch (error) {
    // console.error(error);
    // Send an error response
    return res
      .status(401)
      .json({ error: "Error creating directory: " + error.message });
  }
};

// Read directory, going to default root directory
// chloe: might want to remove this if its not being used often
// exports.redirectToRoot = async (req, res) => {
//   let directoryId = process.env.DEFAULT_ROOT_DIRECTORY;

//   try {
//     const directory_result = await Directory.findById(directoryId);

//     // TODO: needs to return from this ID, add other functions
//     res.status(200).json(directory_result);
//   } catch (error) {
//     res.status(401).json({ error: "Error creating directory: " + error });
//   }
// };
exports.redirectToRoot = async (req, res) => {
  let defaultRootId = process.env.DEFAULT_ROOT_DIRECTORY;

  // Redirect to the readDirectory function with the default root _id
  req.params.id = defaultRootId;
  await exports.readDirectory(req, res);
};

// Reading a directory and its items using its ID
exports.readDirectory = async (req, res) => {
  let directoryId = req.params.id;

  try {
    // Find the directory by its ID
    const directory = await Directory.findById(directoryId);

    if (!directory) {
      res.status(401).json({ error: "Directory not found" });
      return;
    }

    // Find all the subdirectories in the directory
    const subdirectories = await Directory.find({
      parentDirectory: directoryId,
    });

    const sortedDirs = subdirectories.sort((a, b) => {
      return (
        directory.subdirectories.indexOf(a._id.toString()) -
        directory.subdirectories.indexOf(b._id.toString())
      );
    });
    const subdirectoryData = [];

    // Iterate through each subdirectory and count its child subdirectories
    for (const subdirectory of sortedDirs) {
      const childSubdirectoriesCount = await Directory.countDocuments({
        parentDirectory: subdirectory._id,
      });

      subdirectoryData.push({
        _id: subdirectory._id,
        name: subdirectory.name,
        numberOfSubdirectories: childSubdirectoriesCount,
        numberOfQuizzes: subdirectory.quizzes.length,
        // parentDirectory: subdirectory.parentDirectory
      });
    }

    // Find all the quizzes in the directory
    const quizzes = await Quiz.find({ parentDirectory: directoryId });

    // Sort quizzes based on the new order in directory.quizzes
    const sortedQuizzes = quizzes.sort((a, b) => {
      return (
        directory.quizzes.indexOf(a._id.toString()) -
        directory.quizzes.indexOf(b._id.toString())
      );
    });

    // Calculate the number of correct questions for each quiz
    const quizData = await Promise.all(
      sortedQuizzes.map(async (quiz) => {
        // Find questions data for the quiz
        const questionsData = await Quiz.aggregate([
          {
            $match: { _id: quiz._id },
          },
          {
            $lookup: {
              from: "questions", // The name of the questions collection
              localField: "questions",
              foreignField: "_id",
              as: "questionsData",
            },
          },
        ]);

        // Calculate the number of correct questions
        const numberOfCorrectQuestions = questionsData[0].questionsData.reduce(
          (count, question) => {
            return count + (question.isCorrect === true ? 1 : 0);
          },
          0
        );

        return {
          _id: quiz._id,
          quizTitle: quiz.quizTitle,
          numberOfQuestions: quiz.questions.length,
          numberOfCorrectQuestions: numberOfCorrectQuestions,
        };
      })
    );

    // Format result directory
    // chloe: can this be in a Directory object?
    let directory_result = {
      _id: directory._id,
      name: directory.name,
      subdirectories: subdirectoryData,
      quizzes: quizData,
    };
    if (directory.parentDirectory) {
      directory_result.parentDirectory = directory.parentDirectory;
    }

    // Return the structured data
    res.status(200).json(directory_result);
  } catch (error) {
    res.status(401).json({ error: "Error creating directory: " + error });
  }
};

// Eric: maybe in the future i can combine the moveDir and moveQuiz into 1 function.
// Function for moving a directory
exports.moveDirectory = async (req, res) => {
  let directoryId = req.body.directoryId;
  let newParentId = req.body.newParentId;

  try {
    if (!directoryId || !newParentId) {
      res.status(401).json({ error: "missing directoryID or newParentID" });
      return;
    }
    const directory = await Directory.findById(directoryId);
    //client is trying to move root directory.
    if (directoryId == process.env.DEFAULT_ROOT_DIRECTORY) {
      res.status(401).json({ error: "Cannot move route directory." });
    }
    // invalid directory
    else if (!directory) {
      res.status(401).json({ error: "Directory not found" });
    }
    // Get the original parent directory ID before moving.
    const originalParentId = directory.parentDirectory;

    // Update the directory's parentDirectory to the newParentId.
    directory.parentDirectory = newParentId;

    // Save the updated directory.
    await directory.save();

    // Remove the directoryId from the original parent directory's subdirectories.
    if (originalParentId) {
      const originalParentDirectory =
        await Directory.findById(originalParentId);
      if (originalParentDirectory) {
        originalParentDirectory.subdirectories =
          //removing the directory by only keeping subdirectories that dont match the directoryID.
          originalParentDirectory.subdirectories.filter(
            (sub) => sub.toString() !== directoryId
          );
        await originalParentDirectory.save();
      }
    }

    // Add the directoryId to the new parent directory's subdirectories.
    if (newParentId) {
      const newParentDirectory = await Directory.findById(newParentId);
      if (newParentDirectory) {
        newParentDirectory.subdirectories.push(directoryId);
        await newParentDirectory.save();
      }
    }
    // chloe: should this be an empty return?
    res.status(200).json({ newParentId });
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

// Renaming a directory
exports.renameDirectory = async (req, res) => {
  let directoryId = req.body.directoryId;
  let newTitle = req.body.newTitle;

  try {
    if (!directoryId || !newTitle) {
      res
        .status(401)
        .json({ error: "New directory ID and new title are required." });
      return;
    }

    // Update the original directory title
    const updatedDir = await Directory.findByIdAndUpdate(
      directoryId,
      { name: newTitle },
      { new: true }
    ).exec();

    if (updatedDir) {
      res.status(200).json(updatedDir);
    } else {
      res
        .status(401)
        .json({ error: `Directory with ID ${directoryId} not found.` });
    }
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

// Switching the order of quizzes and subdirectories in a directory
exports.switchOrder = async (req, res) => {
  let directoryId = req.body.directoryId;

  let newSubDirIdOrder;
  let newQuizIdOrder;

  try {
    newSubDirIdOrder = req.body.newSubDirIdOrder || [];
    newQuizIdOrder = req.body.newQuizIdOrder || [];
  } catch (error) {
    console.error("Error parsing JSON:", error);
    // Handle the error as needed (e.g., provide a default value for newQuizIdOrder)
    newQuizIdOrder = [];
  }

  try {
    // Find the directory by its ID
    const directory = await Directory.findById(directoryId);

    if (!directory) {
      res.status(401).json({ error: "Directory not found" });
      return;
    }

    // Validate the request body
    if (!Array.isArray(newSubDirIdOrder)) {
      res.status(401).json({ error: "newSubDirIdOrder invalid" });
    }

    // console.log(directory.quizzes);
    // Check that the arrays are the same length as the original arrays
    if (
      newSubDirIdOrder.length !== directory.subdirectories.length ||
      newQuizIdOrder.length !== directory.quizzes.length
    ) {
      res
        .status(401)
        .json({ error: "Arrays must be the same length as the original" });
      return;
    }

    // Check that each _id in subdirectoryIds exists in the original subdirectories array
    for (const quizId of directory.quizzes) {
      if (!newQuizIdOrder.includes(quizId.toString())) {
        res.status(401).json({
          error: `Quiz with ID ${quizId} not found in original quizzes`,
        });
      }
    }

    // Check that each _id in subdirectoryIds exists in the original subdirectories array
    for (const subdirectoryId of directory.subdirectories) {
      if (!newSubDirIdOrder.includes(subdirectoryId.toString())) {
        res.status(401).json({
          error: `Subdirectory with ID ${subdirectoryId} not found in original subdirectories`,
        });
      }
    }

    // Update the order of quizzes and subdirectories
    directory.quizzes = newQuizIdOrder;
    directory.subdirectories = newSubDirIdOrder;

    // Save the changes
    await directory.save();

    // chloe: is this suppose to be empty?
    res.status(200).json({ message: "succesfully switched order!" });
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

// Recursively deleting a directory and its items
exports.deleteDirectory = async (req, res, flag = true) => {
  let directoryId = req.body.directoryId;

  try {
    const directory = await Directory.findById(directoryId);

    if (!directory) {
      res.status(401).json({ error: "Directory not found" });
      return;
    } else if (directoryId == process.env.DEFAULT_ROOT_DIRECTORY) {
      res.status(401).json({ error: "Cannot delete route directory." });
      return;
    }

    // Delete all quizzes within the directory
    // await Quiz.deleteMany({ parentDirectory: directoryId });
    // FIXME: wont work - this should be created here as an internal function
    directory.quizzes.forEach((quiz) => {
      deleteQuiz(quiz._id);
    });

    // Find all subdirectories within this directory
    const subdirectories = await Directory.find({
      parentDirectory: directoryId,
    });

    // Recursively delete subdirectories and their items
    // FIXME: this might not be ideal and can break
    for (const subdirectory of subdirectories) {
      const data = {
        body: {
          directoryId: subdirectory._id.toString(),
        },
      };
      await exports.deleteDirectory(data, res, false);
    }

    // Finally, delete the directory itself
    await Directory.findByIdAndDelete(directoryId);

    if (flag) {
      res
        .status(200)
        .json({ message: "Directory and its items deleted successfully" });
    }
  } catch (error) {
    // console.log(error);
    res.status(401).json({ error: error });
  }
};

// Moving a quiz between directories
exports.moveQuiz = async (req, res) => {
  let quizId = req.body.quizId;
  let newDirectoryId = req.body.newDirectoryId;

  try {
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      res.status(401).json({ error: "Quiz not found" });
      return;
    }

    const newDirectory = await Directory.findById(newDirectoryId);

    if (!newDirectory) {
      res.status(401).json({ error: "Target directory not found" });
      return;
    } else if (newDirectoryId == quiz.parentDirectory) {
      res
        .status(401)
        .json({ error: "new Directory cant be same as original directory." });
      return;
    }

    const originalDirectory = await Directory.findById(quiz.parentDirectory);

    if (!originalDirectory) {
      res.status(401).json({ error: "Original directory not found" });
      return;
    }

    // 1. Add the quiz _id to the new directory's quizzes array.
    newDirectory.quizzes.push(quizId);

    // 2. Change the quiz's ParentDirectory to the new directory.
    quiz.parentDirectory = newDirectoryId;

    // 3. Remove the quiz _id from the original parent directory.
    originalDirectory.quizzes = originalDirectory.quizzes.filter(
      (quizIdInArray) => quizIdInArray.toString() !== quizId.toString()
    );

    // Save changes to all affected documents
    await originalDirectory.save();
    await newDirectory.save();
    await quiz.save();

    // chloe: is this suppose to be empty?
    res.status(200).json({ message: "succesfully moved quiz" });
  } catch (error) {
    res.status(401).json({ error: error });
  }
};

// ==== INTERNAL FUNCTIONS ====

// Reading a directory and its items
// async function readDirectory(directoryId) {
//   try {
//     // Find the directory by its ID
//     const directory = await Directory.findById(directoryId);

//     if (!directory) {
//       throw new Error("Directory not found");
//     }

//     // Find all the subdirectories in the directory
//     const subdirectories = await Directory.find({
//       parentDirectory: directoryId,
//     });

//     const sortedDirs = subdirectories.sort((a, b) => {
//       return (
//         directory.subdirectories.indexOf(a._id.toString()) -
//         directory.subdirectories.indexOf(b._id.toString())
//       );
//     });
//     const subdirectoryData = [];

//     // Iterate through each subdirectory and count its child subdirectories
//     for (const subdirectory of sortedDirs) {
//       const childSubdirectoriesCount = await Directory.countDocuments({
//         parentDirectory: subdirectory._id,
//       });

//       subdirectoryData.push({
//         _id: subdirectory._id,
//         name: subdirectory.name,
//         numberOfSubdirectories: childSubdirectoriesCount,
//         numberOfQuizzes: subdirectory.quizzes.length,
//       });
//     }

//     // Find all the quizzes in the directory
//     const quizzes = await Quiz.find({ parentDirectory: directoryId });

//     // Sort quizzes based on the new order in directory.quizzes
//     const sortedQuizzes = quizzes.sort((a, b) => {
//       return (
//         directory.quizzes.indexOf(a._id.toString()) -
//         directory.quizzes.indexOf(b._id.toString())
//       );
//     });

//     const quizData = sortedQuizzes.map((quiz) => ({
//       _id: quiz._id,
//       quizTitle: quiz.quizTitle,
//       numberOfQuestions: quiz.questions.length,
//       numberOfCorrectQuestions: 0, // Placeholder value to be updated below
//     }));

//     // Return the structured data
//     return {
//       directory: {
//         _id: directory._id,
//         name: directory.name,
//       },
//       subdirectories: subdirectoryData,
//       quizzes: quizData,
//     };
//   } catch (error) {
//     throw error; // Throw the error for the caller to handle
//   }
// }

// TODO: Delete quiz by its ID
function deleteQuiz(quizId) {
  // console.log("Function not implemented yet");
  return quizId;
}
