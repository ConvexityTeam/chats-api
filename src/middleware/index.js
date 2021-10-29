const AuthMiddleware = require('./auth')
const IsOrgMemberMiddleware = require("./org-member");
const PaystackMiddleware = require('./paystackWebhook')

module.exports = {
  ...AuthMiddleware,
  ...IsOrgMemberMiddleware,
  ...PaystackMiddleware
};