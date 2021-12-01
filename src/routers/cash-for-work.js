const router = require("express").Router();

const {

	FileValidator,
	
} = require('../validators');

const {Auth, VendorAuth,  FieldAgentAuth,  BeneficiaryAuth, VendorBeneficiaryAuth} = require("../middleware");
const CashForWorkController = require("../controllers/CashForWorkController");

// router.use(Auth);
router.post("/vendor_task/evidence", VendorAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceVendor);
router.post("/beneficiary_field_agent/evidence", FieldAgentAuth, FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceFieldAgent);
router.post("/beneficiary_task/evidence", BeneficiaryAuth,  VendorBeneficiaryAuth , FileValidator.checkTaskProgressEvidenceFile(), CashForWorkController.uploadProgreeEvidenceByBeneficiary);
router.post("/beneficiary_task/pick",BeneficiaryAuth, VendorBeneficiaryAuth, CashForWorkController.pickTaskFromCampaign);

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
