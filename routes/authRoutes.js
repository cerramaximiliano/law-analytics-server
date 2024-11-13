// routes/authRoutes.js
const express = require("express");
const {
  register,
  login,
  getProfile,
  verifyCode,
  googleAuth,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getProfile);
router.post("/verify-code", verifyCode);
router.post("/google", googleAuth);

module.exports = router;
