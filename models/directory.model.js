module.exports = mongoose => {
    const directorySchema = mongoose.model(
        "Directory",
        new mongoose.Schema({
            name: String, // Name of the directory
            quizzes: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Quiz", // Reference to the Quiz model
                default: [],
              },
            ],
            subdirectories: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Directory", // Reference to the Directory model itself (for subdirectories)
                default: [],
              },
            ],
            parentDirectory: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Directory",
              default: process.env.DEFAULT_ROOT_DIRECTORY, // Set the default value to homeroute for no parent directory
            },
          })
    );
    return directorySchema;
}