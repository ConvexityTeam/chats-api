const {
    User
} = require('../models');
const {
    Response
} = require('../libs');
const {
    OrganisationService,
    NgoService
} = require('../services');
const { HttpStatusCode, SanitizeObject } = require('../utils');

class NgoController {
    static async getAllNGO(req, res) {
        try {
            const allNGOs = await OrganisationService.getAllOrganisations();
            if (allNGOs.length > 0) {
                Response.setSuccess(200, 'NGOs retrieved', allNGOs);
            } else {
                Response.setSuccess(200, 'No NGO found');
            }
            return Response.send(res);
        } catch (error) {
            console.log(error)
            Response.setError(400, error);
            return Response.send(res);
        }
    }

    static async getOneNGO(req, res) {
        const {
            id
        } = req.params;

        if (!Number(id)) {
            Response.setError(400, 'Invalid Request Parameter');
            return Response.send(res);
        }

        try {
            const theNgo = await OrganisationService.getAOrganisation(id);
            if (!theNgo) {
                Response.setError(404, `Cannot find NGO with the id ${id}`);
            } else {
                Response.setSuccess(200, 'Found NGO', theNgo);
            }
            return Response.send(res);
        } catch (error) {
            Response.setError(404, error);
            return Response.send(res);
        }
    }

    static async createAdminMember(req, res) {
        try {
            const {role, ...data}  = SanitizeObject(req.body);
            const { user, organisation } = req;
            const admin = await NgoService.createAdminAccount(organisation, data, role, user);

            Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Account Created.', admin);
            return Response.send(res);
        } catch (error) {
            console.log(error)
            Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, `Internal server error. Contact support.`);
            return Response.send(res);
        }
    }

    static async createVendor(req, res) {
        try {
            // run data validation
            const {
                user,
                organisation
            } = req;

            const {
                first_name,
                last_name,
                email,
                phone,
                address,
                store_name,
                location
            } = req.body;

            const _account = await User.findOne({
                where: {
                    email
                }
            });

            if (_account) {
                Response.setError(400, "Email Already Exists, Recover Your Account");
                return Response.send(res);
            }

            const vendor = await NgoService.createVendorAccount(organisation, {
                first_name,
                last_name,
                email,
                phone,
                address,
                store_name,
                location
            }, user);

            Response.setSuccess(201, 'Vendor Account Created.', vendor);
            return Response.send(res);
        } catch (error) {
            console.log(error)
            Response.setError(500, `Internal server error. Contact support.`);
            return Response.send(res);
        }
    }
}

module.exports = NgoController;