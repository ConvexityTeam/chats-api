const express = require("express");
var router = express.Router();
const OrganisationCtrl = require("../controllers/OrganisationController");
const {Auth} = require("../middleware/main-auth");
const memberAuth = require("../middleware/isMember");

router.post("/flutterwave/webhook", OrganisationCtrl.mintToken);
router.post("/flutterwave/webhook2", OrganisationCtrl.mintToken2);
router.use(Auth);
router.post("/register", OrganisationCtrl.register);
router.use(memberAuth);
router.post("/bantu/webhook", OrganisationCtrl.bantuTransfer);
router.get("/wallets/:organisationId", OrganisationCtrl.getWallets);
router.get("/wallets/main/:organisationId", OrganisationCtrl.getMainWallet);
router.get(
  "/wallets/campaign/:organisationId/:campaignId",
  OrganisationCtrl.getCampignWallet
);
router.post("/member", OrganisationCtrl.addMember);
router.get("/transactions/:organisationId", OrganisationCtrl.fetchTransactions);
router.post("/campaign", OrganisationCtrl.createCampaign);
router.put("/campaign", OrganisationCtrl.updateCampaign);
router.post("/update-profile", OrganisationCtrl.updateProfile);
router.post("/transfer/token", OrganisationCtrl.transferToken);
router.get("/financials/:id", OrganisationCtrl.getFinancials);
router.get(
  "/beneficiaries-summary/:id",
  OrganisationCtrl.getBeneficiariesFinancials
);
router.get("/metric/:id", OrganisationCtrl.getMetric);
module.exports = router;