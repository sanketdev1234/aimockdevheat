const express = require('express');
const router = express.Router();
const axios = require('axios');
const Interview = require('../models/Interview');
// Replace this line:
// const { isLoggedIn } = require('../middleware/auth');

// With this direct implementation:
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Rate limiting for Gemini API calls
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // limit each user to 20 requests per windowMs
});

// GET /interview - show the form
router.get('/', isLoggedIn, (req, res) => {
  res.render('interview', { 
    user: req.user, 
    response: null,
    activePage: 'interview' // For UI navigation highlighting
  });
});

// POST /interview - handle interview generation
router.post('/', isLoggedIn, apiLimiter, async (req, res) => {
  const { prompt, interviewType } = req.body; // Added interview type

  if (!prompt) {
    return res.status(400).render('interview', {
      user: req.user,
      error: 'Prompt is required',
      activePage: 'interview'
    });
  }

  try {
    // Enhanced prompt with context
    const enhancedPrompt = `Act as a ${interviewType || 'technical'} interviewer. 
      Ask one follow-up question after this: ${prompt}`;

    const geminiRes = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
      {
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: process.env.GEMINI_API_KEY },
        timeout: 10000 // 10 second timeout
      }
    );

    const resultText = geminiRes.data.candidates[0]?.content?.parts[0]?.text || 
      "No response generated";

    // Save with additional metadata
    const newInterview = new Interview({
      userId: req.user._id,
      prompt: prompt,
      response: resultText,
      interviewType: interviewType || 'technical',
      modelUsed: 'gemini-1.5-pro'
    });
    
    await newInterview.save();

    res.render('interview', {
      user: req.user,
      response: resultText,
      activePage: 'interview',
      success: 'Interview response generated!'
    });

  } catch (error) {
    console.error('❌ Gemini API error:', error.response?.data || error.message);
    res.status(500).render('interview', {
      user: req.user,
      error: 'Failed to get a response. Please try again later.',
      activePage: 'interview'
    });
  }
});




// GET /interview/history - show interview history
router.get('/history', isLoggedIn, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    
    const interviewCount = interviews.length;
    const averageScore = 84; // Replace with your actual calculation logic
    
    res.render('interview_history', { 
      user: req.user, 
      history: interviews,
      activePage: 'history',
      interviews: interviews.slice(0, 5), // Show only last 5 interviews in stats
      interviewCount,
      averageScore,
      recommendationsCount: 5,
      formatDate: (date) => date.toLocaleString()
    });

  } catch (err) {
    console.error(err);
    // Render the interview_history page with error message instead of error.ejs
    res.status(500).render('interview_history', { 
      user: req.user,
      error: 'Failed to load interview history',
      history: [],
      interviews: [],
      interviewCount: 0,
      averageScore: 0,
      recommendationsCount: 0
    });
  }
});
module.exports = router;