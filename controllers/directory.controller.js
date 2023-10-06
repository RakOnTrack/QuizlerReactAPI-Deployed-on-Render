const models = require("../models");

const Directory = models.directorySchema;
const Quiz = models.quizSchema;

// Creating a new directory
exports.createDirectory = function (name, parentDirectoryId) {
    return new Promise(async function (resolve, reject) {
        try {
            if (!name) {
                reject("Please enter a name for the directory");
            }

            // Create a new directory with the provided name and parent directory ID
            const newDirectory = new Directory({
                name,
            });

            newDirectory.parentDirectory =
                parentDirectoryId || process.env.DEFAULT_ROOT_DIRECTORY; // Set the parent directory if applicable

            // Save the new directory
            const savedDirectory = await newDirectory.save();

            // Update the parent directory's subdirectories array
            if (parentDirectoryId) {
                const parentDirectory = await Directory.findById(parentDirectoryId);
                if (parentDirectory) {
                parentDirectory.subdirectories.push(savedDirectory._id);
                await parentDirectory.save();
                }
            }

            // After creating the directory, call the readDirectory function to retrieve its details
            const directoryDetails = await module.exports.readDirectory(
                parentDirectoryId
            );
            resolve(directoryDetails);
        } catch (error) {
        reject("Error creating directory: " + error);
        }
    });
};
  
// Reading a directory and its items
exports.readDirectory = async function (directoryId) {
try {
    // Find the directory by its ID
    const directory = await Directory.findById(directoryId);

    if (!directory) {
    throw new Error("Directory not found");
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

    const quizData = sortedQuizzes.map((quiz) => ({
    _id: quiz._id,
    quizTitle: quiz.quizTitle,
    numberOfQuestions: quiz.questions.length,
    numberOfCorrectQuestions: 0, // Placeholder value to be updated below
    }));

    // Return the structured data
    return {
    directory: {
        _id: directory._id,
        name: directory.name,
    },
    subdirectories: subdirectoryData,
    quizzes: quizData,
    };
} catch (error) {
    throw error; // Throw the error for the caller to handle
}
};
  
// Eric: maybe in the future i can combine the moveDir and moveQuiz into 1 function.
// Function for moving a directory
exports.moveDirectory = function (directoryId, newParentId) {
return new Promise(async (resolve, reject) => {
    try {
    if (!directoryId || !newParentId) {
        reject("missing directoryID or newParentID");
    }
    const directory = await Directory.findById(directoryId);
    //client is trying to move root directory.
    if (directoryId == process.env.DEFAULT_ROOT_DIRECTORY) {
        throw new Error("Cannot move route directory.");
    }
    // invalid directory
    else if (!directory) {
        throw new Error("Directory not found");
    }
    // Get the original parent directory ID before moving.
    const originalParentId = directory.parentDirectory;

    // Update the directory's parentDirectory to the newParentId.
    directory.parentDirectory = newParentId;

    // Save the updated directory.
    await directory.save();

    // Remove the directoryId from the original parent directory's subdirectories.
    if (originalParentId) {
        const originalParentDirectory = await Directory.findById(
        originalParentId
        );
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
    resolve();
    } catch (error) {
    reject(error);
    }
});
};
  
// Renaming a directory
exports.renameDirectory = function (directoryId, newTitle) {
return new Promise(async (resolve, reject) => {
    try {
    if (!directoryId || !newTitle) {
        reject("New directory ID and new title are required.");
        return;
    }

    // Update the original directory title
    const updatedDir = await Directory.findByIdAndUpdate(
        directoryId,
        { name: newTitle },
        { new: true }
    ).exec();

    if (updatedDir) {
        resolve(updatedDir);
    } else {
        reject(`Directory with ID ${directoryId} not found.`);
    }
    } catch (error) {
    reject(error); // Propagate the error for handling in the route
    }
});
};
  
// Switching the order of quizzes and subdirectories in a directory
exports.switchOrder = function (
directoryId,
newQuizIdOrder,
newSubDirIdOrder
) {
return new Promise(async (resolve, reject) => {
    try {
    // Find the directory by its ID
    const directory = await Directory.findById(directoryId);

    if (!directory) {
        throw new Error("Directory not found");
    }

    // Validate the request body
    if (!Array.isArray(newSubDirIdOrder)) {
        throw new Error("newSubDirIdOrder invalid");
    }

    // Check that the arrays are the same length as the original arrays
    if (
        newSubDirIdOrder.length !== directory.subdirectories.length ||
        newQuizIdOrder.length !== directory.quizzes.length
    ) {
        throw new Error("Arrays must be the same length as the original");
    }

    // Check that each _id in subdirectoryIds exists in the original subdirectories array
    for (const quizId of directory.quizzes) {
        if (!newQuizIdOrder.includes(quizId.toString())) {
        throw new Error(
            `Quiz with ID ${quizId} not found in original quizzes`
        );
        }
    }

    // Check that each _id in subdirectoryIds exists in the original subdirectories array
    for (const subdirectoryId of directory.subdirectories) {
        if (!newSubDirIdOrder.includes(subdirectoryId)) {
        throw new Error(
            `Subdirectory with ID ${subdirectoryId} not found in original subdirectories`
        );
        }
    }

    // Update the order of quizzes and subdirectories
    directory.quizzes = newQuizIdOrder;
    directory.subdirectories = newSubDirIdOrder;

    // Save the changes
    await directory.save();
    resolve();
    } catch (error) {
    reject(error);
    }
});
};
  
// Recursively deleting a directory and its items
exports.deleteDirectory = async function (directoryId) {
try {
    const directory = await Directory.findById(directoryId);

    if (!directory) {
    throw new Error("Directory not found");
    } else if (directoryId == process.env.DEFAULT_ROOT_DIRECTORY) {
    throw new Error("Cannot delete route directory.");
    }

    // Delete all quizzes within the directory
    // await Quiz.deleteMany({ parentDirectory: directoryId });
    directory.quizzes.forEach((quiz) => {
    module.exports.deleteQuiz(quiz._id);
    });

    // Find all subdirectories within this directory
    const subdirectories = await Directory.find({
    parentDirectory: directoryId,
    });

    // Recursively delete subdirectories and their items
    for (const subdirectory of subdirectories) {
    await module.exports.deleteDirectory(subdirectory._id);
    }

    // Finally, delete the directory itself
    await Directory.findByIdAndDelete(directoryId);

    return "Directory and its items deleted successfully";
} catch (error) {
    throw error;
}
};

// Moving a quiz between directories
exports.moveQuiz = function (quizId, newDirectoryId) {
  return new Promise(async (resolve, reject) => {
    try {
      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        reject(new Error("Quiz not found"));
        return;
      }

      const newDirectory = await Directory.findById(newDirectoryId);

      if (!newDirectory) {
        reject(new Error("Target directory not found"));
        return;
      } else if (newDirectoryId == quiz.parentDirectory) {
        reject("new Directory cant be same as original directory.");
      }

      const originalDirectory = await Directory.findById(quiz.parentDirectory);

      if (!originalDirectory) {
        reject(new Error("Original directory not found"));
        return;
      }

      // 1. Add the quiz _id to the new directory's quizzes array.
      newDirectory.quizzes.push(quizId);

      // 2. Change the quiz's ParentDirectory to the new directory.
      quiz.parentDirectory = newDirectoryId;

      // 3. Remove the quiz _id from the original parent directory.
      const indexToRemove = originalDirectory.quizzes.indexOf(quizId);
      if (indexToRemove !== -1) {
        originalDirectory.quizzes.splice(indexToRemove, 1);
      }

      // Save changes to all affected documents
      await Promise.all([
        originalDirectory.save(),
        newDirectory.save(),
        quiz.save(),
      ]);

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};