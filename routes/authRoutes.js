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
  updateUserProfile,
  changePassword,
  requestPasswordReset, verifyResetCode, resetPassword
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
router.put('/update', authMiddleware, updateUserProfile)
// Rutas sin autenticación -- El usuario no tiene autenticación - requiere nueva constraseña
router.put('/change-password', changePassword);
router.post('/reset-request', requestPasswordReset);
//router.post('/verify-reset-code', verifyResetCode);
router.post('/reset', resetPassword);


module.exports = router;
