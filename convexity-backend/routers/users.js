const express = require("express");
const router = express.Router();
const UsersController = require("../controllers/UsersController");
const auth = require("../middleware/main-auth");
const e2e = require("../middleware/e2e"); //End2End Encryption middleware
router.use(e2e);

router.get("/", auth, UsersController.getAllUsers);
router.post("/", auth, UsersController.addUser);
router.get("/:id", auth, UsersController.getAUser);
router.put("/profile", auth, UsersController.updatedUser);
router.put("/profile-image", auth, UsersController.updateProfileImage);
router.put("/nfc_update", auth, UsersController.updateNFC);
router.delete("/:id", auth, UsersController.deleteUser);
router.get( "/transactions/:beneficiary", auth, UsersController.getBeneficiaryTransactions );
router.get( "/recent_transactions/:beneficiary", auth, UsersController.getRecentTransactions );
router.get("/transaction/:uuid", auth, UsersController.getTransaction);
router.get( "/transactions/recieved/:id", auth, UsersController.getTotalAmountRecieved );
router.post("/transact", auth, UsersController.transact);
router.get("/info/statistics", auth, UsersController.getStats);
router.get("/info/chart", auth, UsersController.getChartData);
router.get("/info/wallet-balance/:id", auth, UsersController.getWalletBalance);
router.post("/product/cart", auth, UsersController.addToCart);
router.get("/cart/:userId", auth, UsersController.getCart);
router.post("/cart/checkout", auth, UsersController.checkOut);
router.get("/types/count", auth, UsersController.countUserTypes);
router.post("/reset-password", UsersController.resetPassword);
router.post("/update-password", auth, UsersController.updatePassword);
router.post("/update-pin", auth, UsersController.updatePin);
router.get("/financials/summary/:id", auth, UsersController.getSummary);
router.get("/pending/orders/:userId", auth, UsersController.fetchPendingOrder);
router.post("/action/deactivate", auth, UsersController.deactivate);

module.exports = router;
