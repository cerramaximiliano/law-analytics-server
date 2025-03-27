const router = require("express").Router();

const { getUserStats } = require("../controllers/userStatsController");
const authMiddleware = require("../middlewares/authMiddleware");



router.get('/user', authMiddleware, getUserStats)


module.exports = router

