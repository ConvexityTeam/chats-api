const CampaignService = require('../services/CampaignService');
const util = require('../libs/Utils');

class CashForWorkController {
    constructor() {

    }

    static async getAllCampaigns(req, res) {
        try {
            const userId = null;
            const OrganisationId = null;
            const allCampaign = await CampaignService.getAllCampaigns(userId, OrganisationId, "2");
            if (allCampaign.length > 0) {
                util.setSuccess(200, 'Campaign retrieved', allCampaign);
            } else {
                util.setSuccess(200, 'No Campaign found');
            }
            return util.send(res);
        } catch (error) {
            util.setError(400, error);
            return util.send(res);
        }
    }
    static async getAllOurCampaigns(req, res) {
        try {
            const userId = req.body.UserId;
            const OrganisationId = req.body.OrganisationId;
            const allCampaign = await CampaignService.getAllCampaigns(userId, OrganisationId, "2");
            if (allCampaign.length > 0) {
                util.setSuccess(200, 'Campaign retrieved', allCampaign);
            } else {
                util.setSuccess(200, 'No Campaign found');
            }
            return util.send(res);
        } catch (error) {
            util.setError(400, error);
            return util.send(res);
        }
    }
    static async beneficiariesToCampaign(req, res) {
        try {
            let beneficiaries = req.body;
            let campaignId = req.params.campaignId;
            let results = await loopCampaigns(campaignId, beneficiaries);
            const usersCampaing = await CampaignService.beneficiariesToCampaign(results);
            util.setSuccess(201, 'Beneficiaries Added To Campaign Successfully', usersCampaing);
            util.send(res);

        } catch (error) {
            util.setError(400, error.message);
            return util.send(res);
        }
    }
    /**
     * Funding of Beneficiaries Wallet
     * @param req http request header
     * @param res http response header
     * @async
     */
    static async fundWallets(req, res) {
        try {
            let beneficiaries = req.body;
            let campaignId = req.params.campaignId;
            let results = await loopCampaigns(campaignId, beneficiaries, amount);
            const usersCampaing = await CampaignService.fundWallets(results);
            util.setSuccess(201, 'Beneficiaries Wallets Funded Successfully', usersCampaing);
            util.send(res);
        } catch (error) {
            util.setError(400, error.message);
            return util.send(res);
        }
    }

    static async addCampaign(req, res) {
        if (!req.body.title || !req.body.budget || !req.body.start_date) {
            util.setError(400, 'Please Provide complete details');
            return util.send(res);
        }
        const newCampaign = req.body;
        newCampaign.status = 1;
        newCampaign.type = '2';
        try {
            const createdCampaign = await CampaignService.addCampaign(newCampaign);
            util.setSuccess(201, 'Campaign Created Successfully!', createdCampaign);
            return util.send(res);
        } catch (error) {
            util.setError(400, error.message);
            return util.send(res);
        }
    }

    static async newTask(req, res) {
        // if (!req.body.title || !req.body.budget || !req.body.start_date) {
        //     util.setError(400, 'Please Provide complete details');
        //     return util.send(res);
        // }
        // const newCampaign = req.body;
        // newCampaign.status = 1;
        // newCampaign.type = '2';
        try {
            // const createdCampaign = await CampaignService.addCampaign(newCampaign);
            util.setSuccess(201, 'Tasks Created Successfully!', req.body);
            return util.send(res);
        } catch (error) {
            util.setError(400, error.message);
            return util.send(res);
        }
    }

    static async updatedCampaign(req, res) {
        const alteredCampaign = req.body;
        const { id } = req.params;
        if (!Number(id)) {
            util.setError(400, 'Please input a valid numeric value');
            return util.send(res);
        }
        try {
            const updateCampaign = await CampaignService.updateCampaign(id, alteredCampaign);
            if (!updateCampaign) {
                util.setError(404, `Cannot find Campaign with the id: ${id}`);
            } else {
                util.setSuccess(200, 'Campaign updated', updateCampaign);
            }
            return util.send(res);
        } catch (error) {
            util.setError(404, error);
            return util.send(res);
        }
    }

    static async getACampaign(req, res) {
        const { id } = req.params;
        const OrganisationId = req.body.OrganisationId;
        if (!Number(id)) {
            util.setError(400, 'Please input a valid numeric value');
            return util.send(res);
        }

        try {
            const theCampaign = await CampaignService.getACampaign(id, OrganisationId);
            if (!theCampaign) {
                util.setError(404, `Cannot find Campaign with the id ${id}`);
            } else {
                util.setSuccess(200, 'Found Campaign', theCampaign);
            }
            return util.send(res);
        } catch (error) {
            util.setError(404, error);
            return util.send(res);
        }
    }

    static async deleteCampaign(req, res) {
        const { id } = req.params;
        if (!Number(id)) {
            util.setError(400, 'Please provide a numeric value');
            return util.send(res);
        }

        try {
            const CampaignToDelete = await CampaignService.deleteCampaign(id);
            if (CampaignToDelete) {
                util.setSuccess(200, 'Campaign deleted');
            } else {
                util.setError(404, `Campaign with the id ${id} cannot be found`);
            }
            return util.send(res);
        } catch (error) {
            util.setError(400, error);
            return util.send(res);
        }
    }

}


async function loopCampaigns(campaignId, beneficiaries) {
    try {
        for (let i = 0; i < beneficiaries.length; i++) {
            beneficiaries[i]['CampaignId'] = campaignId;
        }
        return beneficiaries;
    } catch (error) {
        return error;
    }
}

module.exports = CashForWorkController;
