const AuthController = require('./AuthController');
const NgoController  = require('./NgoController');
const WalletController = require('./WalletController');
const VendorController = require('./VendorController')
const BeneficiaryController = require('./BeneficiariesController');
const OrganisationController = require('./OrganisationController');
const ProductController = require('./ProductController');
const CampaignController = require('./CampaignController');
const ComplaintController = require('./ComplaintController');


module.exports = {
  AuthController,
  NgoController,
  VendorController,
  WalletController,
  BeneficiaryController,
  OrganisationController,
  ProductController,
  CampaignController,
  ComplaintController
}
