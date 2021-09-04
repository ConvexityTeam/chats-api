
const {
  Organisations,
  OrganisationMembers
} = require("../models");
const {Response} = require("../libs");
const { HttpStatusCode } = require("../utils");

const IsOrgMember = async (req, res, next) => {
  try {
    const OrganisationId = req.body.organisation_id || req.params.organisation_id || req.query.organisation_id;
    if (!OrganisationId) {
      Response.setError(HttpStatusCode.STATUS_UNAUTHORIZED, 'Orgnisation ID is missing.');
      return Response.send(res);
    }

    const organisation = await Organisations.findByPk(OrganisationId);

    if (!organisation) {
      Response.setError(HttpStatusCode.STATUS_UNAUTHORIZED, 'Orgnisation does not exist..');
      return Response.send(res);
    }

    const member = await OrganisationMembers.findOne({
      where: {
        UserId: req.user.id,
        OrganisationId
      },
    });

    if (!member) {
      Response.setError(HttpStatusCode.STATUS_UNAUTHORIZED, 'Access denied. Your not organisation member.');
      return Response.send(res);
    }
    
    req.organisation = organisation;
    req.member = member;

    next();
  } catch (error) {
    Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error. Please contact support.');
  }
};

exports.IsOrgMember = IsOrgMember;