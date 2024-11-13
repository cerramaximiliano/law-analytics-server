const express = require("express");
const { uploadAvatar } = require("../controllers/cloudinaryController");
const router = express.Router();

router.post("/upload-avatar", uploadAvatar);

module.exports = router;