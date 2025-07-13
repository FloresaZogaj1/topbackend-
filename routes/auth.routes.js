const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const passport = require('../passport'); // Shto këtë rresht!

// Regjistrimi dhe login klasik
router.post('/register', authController.register);
router.post('/login', authController.login);

// Provë API
router.post('/prov', (req, res) => {
  res.json({ message: "Rruga e routes/auth.routes.js është OK" });
});

// ===============================
// GOOGLE LOGIN (SHTO KËTO)
// ===============================

// Hapi 1: Redirecto user-in te Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Hapi 2: Google kthen user-in këtu (redirect URL)
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    // Krijo JWT për frontend
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      },
      process.env.JWT_SECRET || 'sekret',
      { expiresIn: '1d' }
    );
    // Redirecto te frontend me token-in si query param
    res.redirect(`http://localhost:3000?token=${token}`);
  }
);

module.exports = router;
