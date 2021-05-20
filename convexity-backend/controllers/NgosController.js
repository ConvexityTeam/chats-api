const OrganisationsService = require('../services/OrganisationsService');
const db = require('../models');
const util = require('../libs/Utils');
// const { utils } = require('mocha');

class NgosController {

    static async getAllNgos(req, res) {
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

    static async getANgo(req, res) {
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
    /**
     * 
        static async addNGO(req, res) {
            if (!req.body.first_name || !req.body.last_name || !req.body.email) {
                util.setError(400, 'Please provide complete details');
                return util.send(res);
            }
            const newNGO = req.body;
            try {
                const createdNGO = await OrganisationsService.addNGO(newNGO);
                util.setSuccess(201, 'NGO Added!', createdNGO);
                return util.send(res);
            } catch (error) {
                util.setError(400, error.message);
                return util.send(res);
            }
        }
    
        static async updatedNGO(req, res) {
            const alteredNGO = req.body;
            const {
                id
            } = req.params;
            if (!Number(id)) {
                util.setError(400, 'Please input a valid numeric value');
                return util.send(res);
            }
            try {
                const updateNGO = await OrganisationsService.updateNGO(id, alteredNGO);
                if (!updateNGO) {
                    util.setError(404, `Cannot find NGO with the id: ${id}`);
                } else {
                    util.setSuccess(200, 'NGO updated', updateNGO);
                }
                return util.send(res);
            } catch (error) {
                util.setError(404, error);
                return util.send(res);
            }
        }

    static async deleteNGO(req, res) {
        const {
            id
        } = req.params;

        if (!Number(id)) {
            util.setError(400, 'Please provide a numeric value');
            return util.send(res);
        }

        try {
            const NGOToDelete = await OrganisationsService.deleteNGO(id);

            if (NGOToDelete) {
                util.setSuccess(200, 'NGO deleted');
            } else {
                util.setError(404, `NGO with the id ${id} cannot be found`);
            }
            return util.send(res);
        } catch (error) {
            util.setError(400, error);
            return util.send(res);
        }
    }
    */
}

module.exports = NgosController;
