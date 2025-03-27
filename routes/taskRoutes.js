const router = require("express").Router();
const {
  createTask,
  findTasksByUserId,
  findTasksByGroupId,
  findTasksByFolderId,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  addComment,
  manageSubtask,
  getUpcomingTasks,
  assignTask
} = require("../controllers/taskController");

router.post("/", createTask);
router.get("/user/:userId", findTasksByUserId);
router.get("/group/:groupId", findTasksByGroupId);
router.get("/folder/:folderId", findTasksByFolderId);
router.put("/:_id", updateTask);
router.delete("/:_id", deleteTask);
router.put("/:id/toggle", toggleTaskStatus);
router.post("/:id/comments", addComment);
router.post("/:id/subtasks", manageSubtask);
router.put("/:id/subtasks", manageSubtask);
router.get("/upcoming/:userId", getUpcomingTasks);
router.post("/:id/assign", assignTask);

module.exports = router;
