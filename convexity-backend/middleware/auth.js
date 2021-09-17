require("dotenv").config();

const jwt = require("jsonwebtoken");
const {User} = require("../models");
const {Response} = require("../libs");
const { HttpStatusCode } = require("../utils");
const {Guest, SuperAdmin, GodMode, NgoAdmin, NgoSubAdmin, FieldAgent, Vendor, Beneficiary, Donor} = require('../utils').AclRoles;

const Auth = (roleIds = null ) => (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, async (err, payload) => {
      if (err) {
        Response.setError(HttpStatusCode.STATUS_UNAUTHORIZED, "Unauthorised. Token Invalid");
        return Response.send(res);
      }

      const user = await User.findByPk(payload.uid);
      const userOrgs = payload.oids;

      if(!user || !userOrgs) {
        Response.setError(HttpStatusCode.STATUS_UNAUTHORIZED, "Unauthorised. User does not exist in our system");
      }

      // TODO: check user status

      if (user && roleIds && roleIds.length && !roleIds.includes(parseInt(user.RoleId))) {
        Response.setError(HttpStatusCode.STATUS_FORBIDDEN, "Access Denied, UnAuthorised Access");
        return Response.send(res);
      }

      req.user = user;
      req.userOrgs = userOrgs
      next();
    });
  } catch (error) {
    Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Unexpected error occured. Please contact support.');
    return Response.send(res);
  }
};

exports.Auth = Auth();
exports.SuperAdminAuth = Auth([SuperAdmin]);
exports.GodModeAuth = Auth([SuperAdmin, GodMode]);
exports.NgoAdminAuth = Auth([NgoAdmin]);
exports.NgoSubAdminAuth = Auth([NgoAdmin, NgoSubAdmin]);
exports.FieldAgentAuth = Auth([NgoAdmin, NgoSubAdmin, FieldAgent]);
exports.VendorAuth = Auth([Vendor]);
exports.BeneficiaryAuth = Auth([Beneficiary]);
exports.BeneficiaryAuth = Auth([Donor]);
exports.GuestAuth = Auth([Guest, SuperAdmin, GodMode, NgoAdmin, NgoSubAdmin, FieldAgent, Vendor, Beneficiary, Donor])