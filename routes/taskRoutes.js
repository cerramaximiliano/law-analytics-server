const router = require("express").Router();
const {
  createTask,
  findTasksByUserId,
  findTasksByGroupId,
  findTasksByFolderId,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

router.post("/", createTask);
router.get("/user/:userId", findTasksByUserId);
router.get("/group/:groupId", findTasksByGroupId);
router.get("/folder/:folderId", findTasksByFolderId);
router.put("/:_id", updateTask);
router.delete("/:_id", deleteTask);

module.exports = router;
