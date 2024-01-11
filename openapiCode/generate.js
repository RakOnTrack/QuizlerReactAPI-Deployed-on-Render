const jsonObject = {
  quizTitle: "Urban Playground Quiz",
  questions: [
    {
      questionTitle: "What is the atmosphere of an urban playground like?",
      correct_answer: "Vibrant and dynamic",
      incorrect_answers: [
        "Quiet and peaceful",
        "Loud and chaotic",
        "Calm and serene",
      ],
    },
    {
      questionTitle:
        "What type of activities can be found in an urban playground?",
      correct_answer: "Art, music, and technology",
      incorrect_answers: [
        "Sports, shopping, and dining",
        "Gardening, cooking, and crafting",
        "Hiking, biking, and swimming",
      ],
    },
    // Add more questions here
  ],
};

// Convert the JSON object to a JSON string
const jsonString = JSON.stringify(jsonObject, null, 2);

console.log(jsonString);
