const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate AI greeting card image
 * POST /api/greeting-card/generate
 */
exports.generateGreetingCard = async (req, res) => {
  try {
    const { prompt, style = 'inspirational' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // Generate image using DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    const imageUrl = response.data[0].url;

    res.json({
      success: true,
      imageUrl: imageUrl,
      prompt: prompt
    });

  } catch (error) {
    console.error('Error generating greeting card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate greeting card',
      details: error.message
    });
  }
};
