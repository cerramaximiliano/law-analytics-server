// routes/authRoutes.js
const express = require("express");
const {
  register,
  login,
  getProfile,
  verifyCode,
  googleAuth,
  refreshTokens,
  logout,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");



const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getProfile);
router.post("/verify-code", verifyCode);
router.post("/google", googleAuth);
router.post('/refresh-token', refreshTokens);
router.post('/logout', logout);

module.exports = router;
