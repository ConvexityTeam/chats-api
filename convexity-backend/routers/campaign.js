const router = require("express").Router();
const CampaignsController = require("../controllers/CampaignsController");
const { Auth } = require("../middleware");

router.get("/organisation/:id", Auth, CampaignsController.getAllOurCampaigns);
router.get("/all", CampaignsController.getAllCampaigns);
router.post("/", Auth, CampaignsController.addCampaign);
router.post( "/onboard-beneficiaries/:campaignId", Auth, CampaignsController.beneficiariesToCampaign );
router.post("/fund-beneficiaries-wallets", Auth, CampaignsController.fundWallets);
router.get("/:id", Auth, CampaignsController.getACampaign);
router.put("/:id", Auth, CampaignsController.updatedCampaign);
router.delete("/:id", Auth, CampaignsController.deleteCampaign);
router.get("/complaints/:campaignId", Auth, CampaignsController.complaints);

module.exports = router;