require("dotenv").config();

const jwt = require("jsonwebtoken");
const util = require("../libs/Utils");
const {User} = require("../models");
const {Guest, SuperAdmin, GodMode, NgoAdmin, NgoSubAdmin, FieldAgent, Vendor, Beneficiary, Donor} = require('../utils').AclRoles;

const Auth = (roleIds = null ) => (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, async (err, payload) => {
      if (err) {
        util.setError(401, "Unauthorised. Token Invalid");
        return util.send(res);
      }

      const user = await User.findByPk(payload.uid);
      const userOrgs = payload.oids;

      if(!user || !userOrgs) {
        util.setError(401, "Unauthorised. User does not exist in our system");
      }

      // TODO: check user status

      if (user && roleIds && roleIds.length && !roleIds.includes(parseInt(user.RoleId))) {
        util.setError(401, "Access Denied, UnAuthorised Access");
        return util.send(res);
      }

      req.user = user;
      req.userOrgs = userOrgs
      next();
    });
  } catch (error) {
    util.setError(500, 'Unexpected error occured. Please contact support.');
    return util.send(res);
  }
};

exports.Auth = Auth();
exports.AdminAuth = Auth([1]);

exports.BeneficiaryAuth = Auth([1, 2, 3, 4, 5]);
exports.VendorAuth = Auth([1, 2, 3, 4]);
exports.NgoAuth = Auth([1, 2, 3]);

exports.SuperAdminAuth = Auth([SuperAdmin]);
exports.GodModeAuth = Auth([SuperAdmin, GodMode]);
exports.NgoAdminAuth = Auth([NgoAdmin]);
exports.NgoSubAdminAuth = Auth([NgoAdmin, NgoSubAdmin]);
exports.FieldAgentAuth = Auth([NgoAdmin, NgoSubAdmin, FieldAgent]);
exports.VendorAuth = Auth([Vendor]);
exports.BeneficiaryAuth = Auth([Beneficiary]);
exports.BeneficiaryAuth = Auth([Donor]);

exports.GuestAuth = Auth([Guest, SuperAdmin, GodMode, NgoAdmin, NgoSubAdmin, FieldAgent, Vendor, Beneficiary, Donor])