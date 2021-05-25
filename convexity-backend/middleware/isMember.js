const database = require("../models");
const formidable = require("formidable");
const util = require("../libs/Utils");

require("dotenv").config();

module.exports = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.organisation_id) {
      const organisation_exist = await database.Organisations.findOne({
        where: { id: data.organisation_id },
      });
      if (organisation_exist) {
        req.organisation = organisation_exist;
        const member = await database.OrganisationMembers.findOne({
          where: { UserId: req.user.id, OrganisationId: data.organisation_id },
        });
        if (!member) {
          util.setError(
            401,
            "Unauthorised, User is not a Member of the company"
          );
          return util.send(res);
        } else {
          req.member = member;
        }
      } else {
        util.setError(400, "Invalid Organisation Id");
        return util.send(res);
      }
    } else {
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (fields.organisation_id) {
          const organisation = fields.organisation_id;
          const organisation_exist = await database.Organisations.findOne({
            where: { id: organisation },
          });
          if (organisation_exist) {
            req.organisation = organisation_exist;
            const member = await database.OrganisationMembers.findOne({
              where: { UserId: req.user.id, OrganisationId: organisation },
            });
            if (!member) {
              util.setError(
                400,
                "Unauthorised, User is not a Member of the company"
              );
              return util.send(res);
            } else {
              req.member = member;
            }
          } else {
            util.setError(400, "Invalid Organisation Id");
            return util.send(res);
          }
        }
      });
    }
    next();
  } catch (error) {
    res.status(401).json({
      error: error.message,
    });
  }
};
