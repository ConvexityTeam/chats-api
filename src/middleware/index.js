const AuthMiddleware = require('./auth');
const IsOrgMemberMiddleware = require('./org-member');
const PaystackMiddleware = require('./paystackWebhook');
const KoraPayMiddleware = require('./korapayWebhook');
const UserVerifiedMiddleware = require('./user-verified');
const PinVerificationMiddleware = require('./requestWithValidPin');
const Recaptcha = require('./recaptcha');

module.exports = {
  ...AuthMiddleware,
  ...IsOrgMemberMiddleware,
  ...KoraPayMiddleware,
  ...PaystackMiddleware,
  ...UserVerifiedMiddleware,
  ...PinVerificationMiddleware,
  ...Recaptcha
};
