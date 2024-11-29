const router = require("express").Router();
const notificationController = require("../controllers/notificationController");

router.post('/', notificationController.createNotification);
router.get('/user/:userId', notificationController.getNotificationsByUserId);
router.get('/group/:groupId', notificationController.getNotificationsByGroupId);
router.get("/folder/:folderId", notificationController.getNotificationsByFolderId);
router.put('/:id', notificationController.updateNotification);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
