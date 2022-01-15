const router = require("express").Router();

const {

	FileValidator,
	
} = require('../validators');

const {Auth, VendorAuth,  FieldAgentAuth,  BeneficiaryAuth, VendorBeneficiaryAuth} = require("../middleware");
const CashForWorkController = require("../controllers/CashForWorkController");

// router.use(Auth);
router.get("/task/view-tasks",   CashForWorkController.viewTaskById);
router.get("/task/view-task",   CashForWorkController.viewTaskUserSubmission);
router.post("/task/task-approved-agent",  FieldAgentAuth,  CashForWorkController.approveSubmissionAgent);
router.post("/task/task-approved-vendor", VendorAuth,  CashForWorkController.approveSubmissionVendor);

router.post("/task/vendor-evidence", VendorAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceVendor);
router.post("/task/agent-evidence", FieldAgentAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceFieldAgent);
router.post("/task/beneficiary-evidence", BeneficiaryAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceByBeneficiary);

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
