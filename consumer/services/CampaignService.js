const { data } = require('../libs/Utils');
const database = require('../models');
const Transfer = require('../libs/Transfer');


class CampaignService {
  static async getAllCampaigns(campaignType = "campaign") {
    try {
      return await database.Campaign.findAll({
        where: {
          type: campaignType
        }
      });
    } catch (error) {
      // console.log(error)
      throw error;
    }
  }
  static async getOurCampaigns(userId, OrganisationId, campaignType = "campaign") {
    try {
      return await database.Campaign.findAll({
        where: {
          OrganisationId: OrganisationId, type: campaignType
        }
      });
    } catch (error) {
      // console.log(error)
      throw error;
    }
  }
  static async beneficiariesToCampaign(payload) {
    try {
      return await database.Beneficiaries.bulkCreate(payload);
    } catch (error) {
      throw error;
    }
  }
  static async fundWallets(payload, userId, organisationId, campaignId) {
    try {
      // console.log(payload);
      payload.forEach(element => {
        // console.table(element);
        return Transfer.processTransfer(userId, element.UserId, element.amount);
      });
    } catch (error) {
      throw error;
    }
  }
  static async addCampaign(newCampaign) {
    try {
      return await database.Campaign.create(newCampaign);
    } catch (error) {
      throw error;
    }
  }

  static async updateCampaign(id, updateCampaign) {
    try {
      const CampaignToUpdate = await database.Campaign.findOne({ where: { id: Number(id) } });

      if (CampaignToUpdate) {
        return await database.Campaign.update(updateCampaign, { where: { id: Number(id) } });
        //    updateCampaign;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getACampaign(id, OrganisationId) {
    try {
      const theCampaign = await database.Campaign.findAll({
        where: { id: Number(id) },
        include: 'Beneficiaries',
        // include: { all: true, nested: true }
      });
      console.log(theCampaign.Beneficiaries);
      // theCampaign.Beneficiaries.forEach(user => {
      //     console.log(user);
      // });
      return theCampaign;
    } catch (error) {
      // console.log(error);
      throw error;
    }
  }

  static async deleteCampaign(id) {
    try {
      const CampaignToDelete = await database.Campaign.findOne({
        where: {
          id: Number(id)
        }
      });

      if (CampaignToDelete) {
        const deletedCampaign = await database.Campaign.destroy({
          where: {
            id: Number(id)
          }
        });
        return deletedCampaign;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CampaignService;
