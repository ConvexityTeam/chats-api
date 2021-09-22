const AuthController = require('./AuthController');
const NgoController  = require('./NgoController');
const WalletController = require('./WalletController');
const VendorController = require('./VendorController')
const BeneficiaryController = require('./BeneficiariesController');
const OrganisationController = require('./OrganisationController');
const ProductController = require('./ProductController');

module.exports = {
  AuthController,
  NgoController,
  VendorController,
  WalletController,
  BeneficiaryController,
  OrganisationController,
  ProductController
}
