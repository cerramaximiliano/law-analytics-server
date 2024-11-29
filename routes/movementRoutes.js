const express = require("express");
const router = express.Router();
const movementController = require("../controllers/movementController");

router.post("/", movementController.createMovement);
router.get("/user/:userId", movementController.getMovementsByUserId);
router.put("/:id", movementController.updateMovement);
router.delete("/:id", movementController.deleteMovement);
router.get("/folder/:folderId", movementController.getMovementsByFolderId);

module.exports = router;
