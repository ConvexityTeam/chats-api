const CommonValidator = require('./CommonValidator');
const NgoValidator = require('./NgoValidator');
const CampaignValidator = require('./CampaignValidator');
const OrganisationValidator = require('./OrganisationValidator');
const AuthValidator = require('./AuthValidator');
const VendorValidator = require('./VendorValidator');
const BeneficiaryValidator = require('./BeneficiaryValidator');
const UserValidator = require('./UserValidator');
const ProductValidator = require('./ProductValidator');
const ComplaintValidator = require('./ComplaintValidator');

module.exports = {
  AuthValidator,
  CommonValidator,
  NgoValidator,
  VendorValidator,
  CampaignValidator,
  OrganisationValidator,
  BeneficiaryValidator,
  UserValidator,
  ProductValidator,
  ComplaintValidator
}