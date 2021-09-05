const { Response } = require("../libs");
const { HttpStatusCode } = require("../utils");
const { OrganisationService } = require("../services");
const BaseValidator = require("./BaseValidator");

class OrganisationValidator extends BaseValidator {
  // Delcare Rules here

  static async organisationExists(req, res, next) {
    const organisationId = req.params.organisation_id || req.body.organisation_id;
    const organisation = await OrganisationService.findOneById(organisationId);

    if(!organisation) {
      Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Organisation not found.');
    return Response.send(res);
    }

    next();
  }
}
module.exports = OrganisationValidator;