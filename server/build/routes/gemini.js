"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _generativeAi = require("@google/generative-ai");
const router = (0, _express.Router)();
const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured on server');
  }
  const genAI = new _generativeAi.GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048
    }
  });
};
router.post('/chat', async (req, res) => {
  try {
    const {
      history,
      message
    } = req.body;
    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    const model = getGeminiModel();

    // Start chat with provided history
    const chat = model.startChat({
      history: history || []
    });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    res.json({
      text
    });
  } catch (error) {
    var _error$message;
    console.error('Gemini API Error:', error);

    // Handle specific errors
    if ((_error$message = error.message) !== null && _error$message !== void 0 && _error$message.includes('API key')) {
      return res.status(401).json({
        error: 'Invalid API Key configuration'
      });
    }
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});
var _default = exports.default = router;