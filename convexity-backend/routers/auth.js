const express = require("express");
var router = express.Router();
const {AuthController} = require("../controllers");
const { Auth } = require("../middleware/auth"); //Auhorization middleware
const multer = require("../middleware/multer-config"); //for uploading of profile picture and fingerprint
const e2e = require("../middleware/e2e"); //End2End Encryption middleware
router.use(e2e);
//users endpoint
router.post("/login", AuthController.signIn);

router.get('/2fa/init', Auth, AuthController.setTwoFactorSecret);
router.post('/2fa/enable', Auth, AuthController.enableTwoFactorAuth);

router.post("/register", AuthController.createBeneficiary);
router.post("/self-registration", AuthController.beneficiaryRegisterSelf);
router.post("/ngo-register", AuthController.createNgoAccount);
router.post("/register/special-case", AuthController.sCaseCreateBeneficiary);
router.post("/nin-verification", AuthController.verifyNin);
router.post("/update-profile", Auth, AuthController.updateProfile);
router.get("/user-detail/:id", Auth, AuthController.userDetails);

//login
// register
// register/self
// register/special-case

// /login - field agent | ngo | beneficiary
// /verify/nin
// /profile/

module.exports = router;
