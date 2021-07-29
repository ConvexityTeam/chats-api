const express = require("express");
var router = express.Router();
const AdminController = require("../controllers/AdminController");
const AuthCtrl = require("../controllers/AuthController");
const auth = require("../middleware/main-auth");

router.use(auth);
router.put("/update-user", AdminController.updateUserStatus);
router.post("/register", AuthCtrl.createUser);
router.post("/self-registration", AuthCtrl.normalRegistration);
router.post("/ngo-register", AuthCtrl.createAdminUser);
router.post("/register/special-case", AuthCtrl.specialCaseRegistration);
router.post("/update-profile", auth, AuthCtrl.updateProfile);
router.get("/user-detail/:id", auth, AuthCtrl.userDetails);
router.put(
  "/update/campaign/status",
  auth,
  AdminController.updateCampaignStatus
);
module.exports = router;
module.exports = router;
