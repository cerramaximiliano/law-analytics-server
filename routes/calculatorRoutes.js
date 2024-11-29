const router = require("express").Router();
const calculatorController = require("../controllers/calculatorController");

router.post("/", calculatorController.createCalculator);
router.get("/user/:userId", calculatorController.getCalculatorsByUserId);
router.get("/group/:groupId", calculatorController.getCalculatorsByGroupId);
router.get("/folder/:folderId", calculatorController.getCalculatorsByFolderId);
router.get("/filter", calculatorController.getCalculatorsByUserIdTypeClass);
router.put("/:id", calculatorController.updateCalculator);
router.delete("/:id", calculatorController.deleteCalculator);

module.exports = router;
