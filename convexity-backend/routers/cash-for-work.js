const express = require("express");
const router = express.Router();
const CashForWorkController = require("../controllers/CashForWorkController");
const auth = require("../middleware/main-auth");

router.use(auth);
router.post("/newTask", CashForWorkController.newTask);
router.get("/:cashforworkid", CashForWorkController.getCashForWork);
router.get("/", CashForWorkController.getAllCashForWork);
router.get("/tasks/:campaignId", CashForWorkController.getTasks);
router.get("/task/:taskId", CashForWorkController.getTask);
router.post("/task/addWorkers", CashForWorkController.addWorkersToTask);
router.post("/task/submit-progress", CashForWorkController.submitProgress);
router.post("/task/progress/confirm", CashForWorkController.approveProgress);
router.post("/task/pay-wages", CashForWorkController.payWages);
module.exports = router;
