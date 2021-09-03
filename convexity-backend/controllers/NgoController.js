const {
    User
} = require('../models');
const util = require('../libs/Utils');
const OrganisationsService = require('../services/OrganisationsService');
const NgoService = require('../services/NgoService');

class NgoController {
    static async getAllNGO(req, res) {
        try {
            const allNGOs = await OrganisationsService.getAllOrganisations();
            if (allNGOs.length > 0) {
                util.setSuccess(200, 'NGOs retrieved', allNGOs);
            } else {
                util.setSuccess(200, 'No NGO found');
            }
            return util.send(res);
        } catch (error) {
            console.log(error)
            util.setError(400, error);
            return util.send(res);
        }
    }

    static async getOneNGO(req, res) {
        const {
            id
        } = req.params;

        if (!Number(id)) {
            util.setError(400, 'Invalid Request Parameter');
            return util.send(res);
        }

        try {
            const theNgo = await OrganisationsService.getAOrganisation(id);
            if (!theNgo) {
                util.setError(404, `Cannot find NGO with the id ${id}`);
            } else {
                util.setSuccess(200, 'Found NGO', theNgo);
            }
            return util.send(res);
        } catch (error) {
            util.setError(404, error);
            return util.send(res);
        }
    }

    static async createFieldAgent(req, res) {
        try {
            // validate email
            const _account = await User.findOne({
                where: {
                    email: req.body.email
                }
            });
    
            if (_account) {
                util.setError(400, "Email Already Exists, Recover Your Account");
                return util.send(res);
            }
            
            const data = req.body;
            const {
                user,
                organisation
            } = req;
            const agent = await NgoService.createFieldAgentAccount(organisation, data, user);

            util.setSuccess(201, 'Field Agent Account Created.', agent);
            return util.send(res);

        } catch (error) {
            console.log(error)
            util.setError(500, `Internal server error. Contact support.`);
            return util.send(res);
        }
    }

    static async createSubAdmin(req, res) {

        try {
            const _account = await User.findOne({
                where: {
                    email: req.body.email
                }
            });
    
            if (_account) {
                util.setError(400, "Email Already Exists, Recover Your Account");
                return util.send(res);
            }
            // validate email
            const data = req.body;
            const {
                user,
                organisation
            } = req;
            const subAdmin = await NgoService.createSubAdminAccount(organisation, data, user);

            util.setSuccess(201, 'Sub Admin Account Created.', subAdmin);
            return util.send(res);

        } catch (error) {
            console.log(error)
            util.setError(500, `Internal server error. Contact support.`);
            return util.send(res);
        }
    }

    static async createAdmin(req, res) {
        try {
            // validate email
            const _account = await User.findOne({
                where: {
                    email: req.body.email
                }
            });
    
            if (_account) {
                util.setError(400, "Email Already Exists, Recover Your Account");
                return util.send(res);
            }

            const data = req.body;
            const {
                user,
                organisation
            } = req;
            const admin = await NgoService.createAdminAccount(organisation, data, user);

            util.setSuccess(201, 'Admin Account Created.', admin);
            return util.send(res);

        } catch (error) {
            console.log(error)
            util.setError(500, `Internal server error. Contact support.`);
            return util.send(res);
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
                util.setError(400, "Email Already Exists, Recover Your Account");
                return util.send(res);
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

            util.setSuccess(201, 'Vendor Account Created.', vendor);
            return util.send(res);
        } catch (error) {
            console.log(error)
            util.setError(500, `Internal server error. Contact support.`);
            return util.send(res);
        }
    }
}

module.exports = NgoController;