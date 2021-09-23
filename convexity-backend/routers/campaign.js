const router = require("express").Router();
const {CampaignController} = require("../controllers");
const { Auth } = require("../middleware");

// router.get("/organisation/:id", Auth, CampaignsController.getAllOurCampaigns);
// router.get("/all", CampaignsController.getAllCampaigns);
// router.post("/", Auth, CampaignsController.addCampaign);
router.post( "/onboard-beneficiaries/:campaignId", Auth, CampaignController.beneficiariesToCampaign );
router.post("/fund-beneficiaries-wallets", Auth, CampaignController.fundWallets);
router.get("/:id", Auth, CampaignController.getACampaign);
router.put("/:id", Auth, CampaignController.updatedCampaign);
router.delete("/:id", Auth, CampaignController.deleteCampaign);
router.get("/complaints/:campaignId", Auth, CampaignController.complaints);

module.exports = router;