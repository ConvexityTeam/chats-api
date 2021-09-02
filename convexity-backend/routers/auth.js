const express = require("express");
var router = express.Router();
const AuthCtrl = require("../controllers/AuthController");
const { Auth } = require("../middleware/auth"); //Auhorization middleware
const multer = require("../middleware/multer-config"); //for uploading of profile picture and fingerprint
const e2e = require("../middleware/e2e"); //End2End Encryption middleware
router.use(e2e);
//users endpoint
router.post("/login", AuthCtrl.signIn);
router.post("/register", AuthCtrl.createBeneficiary);
router.post("/self-registration", AuthCtrl.beneficiaryRegisterSelf);
router.post("/ngo-register", AuthCtrl.createNgoAccount);
router.post("/register/special-case", AuthCtrl.sCaseCreateBeneficiary);
router.post("/nin-verification", AuthCtrl.verifyNin);
router.post("/update-profile", Auth, AuthCtrl.updateProfile);
router.get("/user-detail/:id", Auth, AuthCtrl.userDetails);

//login
// register
// register/self
// register/special-case

// /login - field agent | ngo | beneficiary
// /verify/nin
// /profile/

module.exports = router;
