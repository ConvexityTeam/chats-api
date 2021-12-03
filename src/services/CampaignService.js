const {
  Sequelize,
  Op
} = require('sequelize');
const {
  User,
  Wallet,
  Campaign,
  Complaint,
  Beneficiary,
  Transaction,
  CampaignVendor
} = require("../models");
const {
  userConst,
  walletConst
} = require("../constants");
const Transfer = require("../libs/Transfer");
const QueueService = require('./QueueService');
const { generateTransactionRef } = require('../utils');

class CampaignService {
  static searchCampaignTitle(title, extraClause = null) {
    const where = {
      ...extraClause,
      title: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('title')), 'LIKE', `%${title.toLowerCase()}%`)
    };

    return Campaign.findOne({
      where
    });
  }

  static getCampaignById(id) {
    return Campaign.findByPk(id);
  }

  static campaignBeneficiaryExists(CampaignId, UserId) {
    return Beneficiary.findOne({
      CampaignId,
      UserId
    });
  }

  static addCampaign(newCampaign) {
    return Campaign.create(newCampaign);
  }

  static addBeneficiaryComplaint(campaign, UserId, report) {
    return campaign.createComplaint({
      UserId,
      report
    });
  }

  static addBeneficiary(CampaignId, UserId) {
    return Beneficiary.findOne({
        where: {
          CampaignId,
          UserId
        }
      })
      .then(beneficiary => {
        if (beneficiary) {
          return beneficiary;
        }
        return Beneficiary.create({
            CampaignId,
            UserId
          })
          .then(newBeneficiary => {
            QueueService.createWallet(UserId, 'user', CampaignId)
            return newBeneficiary;
          });
      })
  }

  static removeBeneficiary(CampaignId, UserId) {
    return Beneficiary.destroy({
        where: {
          CampaignId,
          UserId
        }
      })
      .then((res) => {
        if (res) {
          return Wallet.destroy({
            where: {
              wallet_type: 'user',
              CampaignId,
              UserId
            }
          })
        }
        return null;
      });
  }

  static async approvedVendor(CampaignId, VendorId) {
    const record = await CampaignVendor.findOne({
      where: {
        CampaignId,
        VendorId
      }
    });
    if (record) {
      await record.update({
        approved: true
      });
      return record;
    }

    return CampaignVendor.create({
      CampaignId,
      VendorId,
      approved: true
    })
  }

  static async getVendorCampaigns(VendorId) {
    return CampaignVendor.findAll({
      where: {
        VendorId
      },
      include: [
        'Campaign'
      ]
    });
  }

  static getCampaignWithBeneficiaries(id) {
    return Campaign.findOne({
      where: {
        id
      },
      attributes: {
        include: [
          [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
        ]
      },
      include: [{
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr,
          through: {
            attributes: []
          }
        },
        {
          model: Wallet,
          as: 'BeneficiariesWallets',
          attributes: walletConst.walletExcludes
        }
      ],
      group: ['Campaign.id', 'Beneficiaries.id', 'BeneficiariesWallets.uuid']
    })
  }

  static getCampaignComplaint(CampaignId) {
    return Complaint.findAll({
      where: {
        CampaignId
      },
      include: [{
        model: User,
        as: 'Beneficiary',
        attributes: userConst.publicAttr,
      }]
    });
  }

  static beneficiaryCampaings(UserId, extraClasue = null) {
    return Beneficiary.findAll({
      where: {
        UserId
      },
      include: [{
        model: Campaign,
        where: {
          ...extraClasue
        },
        as: 'Campaign',
        include: ['Organisation']
      }]
    })
  }

  static getCampaigns(queryClause = {}) {
    const where = queryClause;
    return Campaign.findAll({
      where: {
        ...where
      },
      attributes: {
        include: [
          [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
        ]
      },
      include: ['Beneficiaries'],
      includeIgnoreAttributes: false,
      group: [
        "Campaign.id"
      ],
    });
  }

  static updateSingleCampaign(id, update) {
    return Campaign.update(update, {
      where: {
        id
      }
    });
  }

  static async getAllCampaigns(queryClause = null) {
    return Campaign.findAll({
      where: {
        ...queryClause
      },
      include: ['Organisation']
    });
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
    return Beneficiary.bulkCreate(payload);
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
    return Campaign.findAll({
      where: {
        id: Number(id)
      },
      include: ["Beneficiaries"],
    });
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

  static cashForWorkCampaignByApprovedBeneficiary() {
    return Campaign.findAll({
      where: {
        type: 'cash-for-work'
      },
      include: [{
        model: Beneficiary,
        as: 'Beneficiaries',
        attribute: [],
        where: {
          approved: true
        }
      }]
    });
  }

  static async handleCampaignApproveAndFund(campaign, campaignWallet, OrgWallet, beneficiaries) {
    const payload = {
      CampaignId: campaign.id,
      NgoWalletId: OrgWallet.uuid,
      CampaignWalletId: campaignWallet.uuid,
      beneficiaries: beneficiaries.map(beneficiary => {
        const bWalletId = beneficiary.User.Wallets.length ? beneficiary.User.Wallets[0].uuid : null;
        return [
          beneficiary.UserId,
          bWalletId
        ]
      })
    };


    await campaign.update({status: 'completed', is_funded: true, amount_disbursed: campaign.budget });
    await Wallet.update({ balance: Sequelize.literal(`balance - ${campaign.budget}`)}, {
      where: {uuid: OrgWallet.uuid}
    });

    // Queue fuding disbursing

    const transaction = await Transaction.create({
      amount: campaign.budget,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      SenderWalletId: OrgWallet.uuid,
      ReceiverWalletId: campaignWallet.uuid,
      OrganisationId: campaign.OrganisationId,
      narration: 'Approve Campaign Funding'
    });

    return {
      campaign,
      transaction
    }
  }
}

module.exports = CampaignService;