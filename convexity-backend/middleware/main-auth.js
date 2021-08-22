const jwt = require("jsonwebtoken");
const util = require("../libs/Utils");
const user = require("../models/user");
require("dotenv").config();

const Auth = (roleIds = null ) => (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, (err, value) => {
      if (err) {
        util.setError(401, "Unauthorised. Token Invalid");
        return util.send(res);
      }

      if (value.user && roleIds && roleIds.length && !roleIds.includes(parseInt(value.user.RoleId))) {
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
exports.AdminAuth = Auth([1]);
exports.SuperAdminAuth = Auth([1, 2]);
exports.BeneficiaryAuth = Auth([1, 2, 3, 4, 5]);
exports.VendorAuth = Auth([1, 2, 3, 4]);
exports.NgoAuth = Auth([1, 2, 3]);