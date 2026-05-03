const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/auth.controller');

// GET  /auth/login  → tampilkan form login
router.get('/login', authController.showLogin);

// POST /auth/login  → proses login
router.post('/login', authController.login);

// GET  /auth/logout → logout
router.get('/logout', authController.logout);

module.exports = router;