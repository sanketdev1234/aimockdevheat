// routes/auth.js
const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();
const Interview = require('../models/Interview');

router.get('/', (req, res) => {
  res.redirect('/login');
});

// GET: Register page
router.get('/register', (req, res) => {
  res.render('register');
});

// POST: Handle user registration
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username });
    await User.register(user, password);
    res.redirect('/login');
  } catch (err) {
    res.locals.error = err.message;
    return res.render('interview', {
      user: req.user,
      response: null,
      activePage: 'interview'
    });
  }
});

// GET: Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// POST: Handle user login
router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

// GET: Dashboard (protected route)

router.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
    const interviewCount = await Interview.countDocuments({ userId: req.user._id });
    const interviews = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Calculate average score (example - modify with your actual logic)
    const averageScore = (interviewCount/100)*100; // Replace with actual calculation
    
    res.render('dashboard', {
      user: req.user,
      interviews,
      interviewCount,
      averageScore,
      recommendationsCount: 5 // Replace with actual count
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

// Middleware to protect routes
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = router;