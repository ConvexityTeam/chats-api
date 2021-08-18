const jwt = require("jsonwebtoken");
const util = require("../libs/Utils");
const user = require("../models/user");
require("dotenv").config();

const Auth = (roleId = null) => (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, (err, value) => {
      if (err) {
        util.setError(401, "Unauthorised. Token Invalid");
        return util.send(res);
      }

      if (value.user && roleId && value.user.RoleId != roleId) {
        util.setError(401, "Access Denied, UnAuthorised Access");
        return util.send(res);
      }

      req.user = value.user;
      next();
    });
  } catch (error) {
    util.setError(401, error.message);
    return util.send(res);
  }
};

exports.Auth = Auth();
exports.AdminAuth = Auth(1);
exports.SuperAdminAuth = Auth(2);
exports.BeneficiaryAuth = Auth(5);
exports.VendorAuth = Auth(4);
exports.NgoAuth = Auth(3);