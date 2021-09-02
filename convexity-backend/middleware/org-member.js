const util = require("../libs/Utils");
const  { Organisations, OrganisationMembers } = require("../models");

const IsOrgMember = async (req, res, next) => {
  try {
    const OrganisationId = req.body.organisation_id || req.params.organisation_id || req.query.organisation_id;
    if (OrganisationId) {
      Organisations.findByPk(OrganisationId)
        .then(organisation => {
          req.organisation = organisation;
          return OrganisationMembers.findOne({
            where: {
              UserId: req.user.id,
              OrganisationId
            },
          });
        })
        .then(member => {
          req.orgMember = member;
          next();
        })
        .catch(_ => {
          util.setError(401, 'Authorization error. Please retry.');
          if (!req.organisation) {
            util.setError(401, 'Organisation does not exist.');
          }
          if (!req.orgMember) {
            util.setError(401, 'Access denied. Your not organisation member.');
          }
          return util.send(res);
        })
    } else {
      util.setError(400, 'Orgnisation ID is missing.');
      return util.send(res);
    }
  } catch (error) {
    util.setError(500, 'Server error. Please contact support.');
  }
};

exports.IsOrgMember = IsOrgMember;