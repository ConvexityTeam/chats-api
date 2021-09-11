const CommonValidator = require('./CommonValidator');
const NgoValidator = require('./NgoValidator');
const CampaignValidator = require('./CampaignValidator');
const OrganisationValidator = require('./OrganisationValidator');
const AuthValidator = require('./AuthValidator');
const VendorValidator = require('./VendorValidator');

module.exports = {
  AuthValidator,
  CommonValidator,
  NgoValidator,
  VendorValidator,
  CampaignValidator,
  OrganisationValidator
}