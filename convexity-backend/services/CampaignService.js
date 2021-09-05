const {
  data
} = require("../libs/Utils");
const database = require("../models");
const Transfer = require("../libs/Transfer");
const {
  Sequelize,
  Op
} = require('sequelize');
const {
  Campaign
} = require("../models");

class CampaignService {
  static searchCampaignTitle(title, extraClause = null) {
    const where = Sequelize.where(Sequelize.fn('lower', Sequelize.col('title')), {
      [Op.like]: `${title}`,
    });

    return Campaign.findOne({
      where
    });
  }

  static getCampaignById(id) {
    return Campaign.findByPk(id);
  }

  static addCampaign(newCampaign) {
    return Campaign.create(newCampaign);
  }

  static getCampaigns(queryClause = {}) {
    const where = queryClause;
    return Campaign.findAll({where: {...where}});
  }

  static updateSingleCampaign(id, update) {
    return Campaign.update(update, {where: {id}});
  }

  static async getAllCampaigns(campaignType = "campaign") {
    try {
      return await Campaign.findAll({
        where: {
          type: campaignType,
        },
      });
    } catch (error) {
      // console.log(error)
      throw error;
    }
  }
  static async getOurCampaigns(
    userId,
    OrganisationId,
    campaignType = "campaign"
  ) {
    try {
      return await Campaign.findAll({
        where: {
          OrganisationId: OrganisationId,
          type: campaignType,
        },
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
      payload.forEach((element) => {
        // console.table(element);
        return Transfer.processTransfer(userId, element.UserId, element.amount);
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateCampaign(id, updateCampaign) {
    try {
      const CampaignToUpdate = await Campaign.findOne({
        where: {
          id: Number(id)
        },
      });

      if (CampaignToUpdate) {
        return await Campaign.update(updateCampaign, {
          where: {
            id: Number(id)
          },
        });
        //    updateCampaign;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getACampaign(id, OrganisationId) {
    try {
      const theCampaign = await Campaign.findAll({
        where: {
          id: Number(id)
        },
        include: "Beneficiaries",
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
      const CampaignToDelete = await Campaign.findOne({
        where: {
          id: Number(id),
        },
      });

      if (CampaignToDelete) {
        const deletedCampaign = await Campaign.destroy({
          where: {
            id: Number(id),
          },
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