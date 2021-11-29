const router = require("express").Router();

const {Auth} = require("../middleware");
const CashForWorkController = require("../controllers/CashForWorkController");

// router.use(Auth);
router.get("/approved/beneficiaries", CashForWorkController.viewCashForWorkRefractor);
router.get("/", CashForWorkController.getAllCashForWork);
router.post("/newTask", CashForWorkController.newTask);
router.get("/:cashforworkid", CashForWorkController.getCashForWork);
router.get("/tasks/:campaignId", CashForWorkController.getTasks);
router.get("/task/:taskId", CashForWorkController.getTask);
router.post("/task/addWorkers", CashForWorkController.addWorkersToTask);
router.post("/task/submit-progress", CashForWorkController.submitProgress);
router.post("/task/progress/confirm", CashForWorkController.approveProgress);
router.post("/task/pay-wages", CashForWorkController.payWages);

module.exports = router;
