const express = require('express');
const { Configuration, DefaultApi } = require('openai');
const app = express();

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new DefaultApi(configuration);

// Define a route to generate the quiz
app.post('/generate-quiz', async (req, res) => {
  const { quizTopic } = req.body;
  
  try {
    if (!quizTopic || quizTopic.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a valid quiz topic.' });
    }

    const prompt = generatePrompt(quizTopic);
    const completion = await openai.createCompletion({ prompt });

    const completionText = completion.choices[0].text;
    res.status(200).json({ result: completionText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during quiz generation.' });
  }
});

// Your generatePrompt function remains the same

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
