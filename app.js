// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const axios = require('axios');

const app = express();

// Routes
const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('MongoDB error:', err));

const User = require('./models/User');
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // ✅ For JSON POST bodies
app.use(express.static(path.join(__dirname, 'public')));

// Session + Passport
app.use(session({
  secret: 'mockinterviewsecret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  res.locals.error = null; // Initialize error
  next();
});

// ✅ Gemini API Route
app.post('/api/gemini', async (req, res) => {
  const userInput = req.body.prompt;

  if (!userInput) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
      {
        contents: [
          {
            parts: [{ text: userInput }]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: process.env.GEMINI_API_KEY }
      }
    );

    const resultText = response.data.candidates[0].content.parts[0].text;
    res.json({ response: resultText });

  } catch (error) {
    console.error('❌ Gemini API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch response from Gemini API' });
  }
});

// Use other routes
app.use('/', authRoutes);
app.use('/interview', interviewRoutes);

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
