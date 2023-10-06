module.exports = mongoose => {
    const questionSchema = mongoose.model(
        "Questions",
        new mongoose.Schema({
            questionTitle: String,
            correct_answer: String,
            incorrect_answers: [String],
            isCorrect: {
              type: Boolean,
              default: false,
            },
          })
    );
    return questionSchema;
}