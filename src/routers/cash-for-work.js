const router = require("express").Router();

const {

	FileValidator,
	
} = require('../validators');

const {Auth, VendorAuth,  FieldAgentAuth,  BeneficiaryAuth, VendorBeneficiaryAuth, NgoSubAdminAuth} = require("../middleware");
const CashForWorkController = require("../controllers/CashForWorkController");
const CampaignController = require('../controllers/CampaignController')

// router.use(Auth);
router.get("/evidence",  CashForWorkController.evidence);

router.get("/:task_id/evidence/:user_id",    CashForWorkController.viewSubmittedEvidence);
router.post("/task/task-approved-vendor", VendorAuth,  CashForWorkController.approveSubmissionVendor);
router.post("/task/task-approved-agent",  FieldAgentAuth,  CashForWorkController.approveSubmissionAgent);

router.post("/task/vendor-evidence", VendorAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceVendor);
router.post("/task/agent-evidence", FieldAgentAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceFieldAgent);
router.post("/task/beneficiary-evidence",BeneficiaryAuth,  FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceByBeneficiary);
router.post('/task/reject-submission/:taskAssignmentId',  CampaignController.rejectSubmission)
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
