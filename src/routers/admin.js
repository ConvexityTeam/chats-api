const router = require("express").Router();

const AdminController = require("../controllers/AdminController");
const AuthCtrl = require("../controllers/AuthController");

router.put("/update-user", AdminController.updateUserStatus);
router.post("/register", AuthCtrl.createUser);
router.post("/self-registration", AuthCtrl.normalRegistration);
router.post("/ngo-register", AuthCtrl.createAdminUser);
router.post("/register/special-case", AuthCtrl.specialCaseRegistration);
router.post("/update-profile", AuthCtrl.updateProfile);
router.get("/user-detail/:id", AuthCtrl.userDetails);
router.put("/update/campaign/status", AdminController.updateCampaignStatus );

module.exports = router;