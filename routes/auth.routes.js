// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const passport = require('../passport');

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const SUCCESS_PATH = process.env.CLIENT_SUCCESS_PATH || "/auth/success";

// login/register klasik
router.post('/register', authController.register);
router.post('/login', authController.login);

// GOOGLE
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login`, session: false }),
  (req, res) => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET || 'sekret',
      { expiresIn: '7d' }
    );
    const name = encodeURIComponent(req.user.name || '');
    res.redirect(`${FRONTEND_URL}${SUCCESS_PATH}?token=${token}&name=${name}`);
  }
);

module.exports = router;
