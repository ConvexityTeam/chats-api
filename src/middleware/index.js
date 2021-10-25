const AuthMiddleware = require('./auth')
const IsOrgMemberMiddleware = require("./org-member");

module.exports = {
  ...AuthMiddleware,
  ...IsOrgMemberMiddleware
};