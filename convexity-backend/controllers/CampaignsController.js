const CampaignService = require("../services/CampaignService");
const db = require("../models");
const util = require("../libs/Utils");
const { Op } = require("sequelize");
var amqp_1 = require("./../libs/RabbitMQ/Connection");
const { Message } = require("@droidsolutions-oss/amqp-ts");
var approveToSpendQueue = amqp_1["default"].declareQueue("approveToSpend", {
  durable: true,
});
var createWalletQueue = amqp_1["default"].declareQueue("createWallet", {
  durable: true,
});

class CampaignsController {
  static async getAllCampaigns(req, res) {
    try {
      const type = req.query.type ? req.query.type : "campaign";
      const allowed_types = ["campaign", "cash-for-work"];
      if (!allowed_types.includes(type)) {
        type = "campaign";
      }
      const allCampaign = await CampaignService.getAllCampaigns(type);
      if (allCampaign.length > 0) {
        util.setSuccess(200, "Campaign retrieved", allCampaign);
      } else {
        util.setSuccess(200, "No Campaign found");
      }
      return util.send(res);
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
  }
  static async getAllOurCampaigns(req, res) {
    try {
      const type = req.query.type ? req.query.type : "campaign";

      const allowed_types = ["campaign", "cash-for-work"];
      if (!allowed_types.includes(type)) {
        type = "campaign";
      }
      const OrganisationId = req.params.id;
      const organisation_exist = await db.Organisations.findOne({
        where: { id: OrganisationId },
        include: "Member",
      });

      if (organisation_exist) {
        const members = organisation_exist["Member"].map((element) => {
          return element.id;
        });
        let campaignsArray = [];
        const campaigns = await db.Campaign.findAll({
          where: {
            OrganisationMemberId: {
              [Op.or]: members,
            },
            type: type,
          },
        });
        for (let campaign of campaigns) {
          let beneficiaries_count = await campaign.countBeneficiaries();
          campaignsArray.push({
            id: campaign.id,
            title: campaign.title,
            type: campaign.type,
            description: campaign.description,
            status: campaign.status,
            budget: campaign.budget,
            location: campaign.location,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
            beneficiaries_count: beneficiaries_count,
          });
        }
        util.setSuccess(200, "Campaigns Retrieved", campaignsArray);
        return util.send(res);
      } else {
        util.setError(422, "Invalid Organisation Id");
        return util.send(res);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
  static async beneficiariesToCampaign(req, res) {
    try {
      const campaign_exist = await db.Campaign.findOne({
        where: { id: req.params.campaignId, type: "campaign" },
      });
      if (campaign_exist) {
        let beneficiaries = req.body.users;

        const users = beneficiaries.map((element) => {
          return element.UserId;
        });
        const main = [...new Set(users)];

        const beneficiaries_already_added = await db.Beneficiaries.findAll({
          where: {
            CampaignId: req.params.campaignId,
            UserId: {
              [Op.or]: main,
            },
          },
        });

        if (!beneficiaries_already_added.length) {
          main.forEach(async (element) => {
            await db.Beneficiaries.create({
              UserId: element,
              CampaignId: req.params.campaignId,
            }).then(() => {
              createWalletQueue.send(
                new Message(
                  {
                    id: element,
                    campaign: req.params.campaignId,
                    type: "user",
                  },
                  { contentType: "application/json" }
                )
              );
            });
          });

          util.setSuccess(201, "Beneficiaries Added To Campaign Successfully");
          return util.send(res);
        } else {
          util.setError(
            422,
            "Some User(s) has already been added as Beneficiaries to the campaign"
          );
          return util.send(res);
        }
      } else {
        util.setError(422, "Invalid Campaign Id");
        return util.send(res);
      }
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
      const campaign_exist = await db.Campaign.findOne({
        where: { id: req.body.CampaignId },
        include: [
          { model: db.OrganisationMembers, as: "OrganisationMember" },
          {
            model: db.Beneficiaries,
            as: "Beneficiaries",
            include: {
              model: db.User,
              as: "User",
              where: { RoleId: "5", status: "activated" },
            },
          },
        ],
      });

      if (campaign_exist) {
        if (!campaign_exist.Beneficiaries.length) {
          util.setError(
            404,
            "No Approved Beneficiaries currently attached to this campaign"
          );
          return util.send(res);
        }
        const organisation = await campaign_exist.OrganisationMember.getOrganisation();
        const wallet = await organisation.getWallet({
          where: { CampaignId: campaign_exist.id },
        });

        if (wallet[0].balance >= campaign_exist.budget) {
          const beneficiaries_count = campaign_exist["Beneficiaries"].length;
          const amount = Math.floor(
            campaign_exist.budget / beneficiaries_count
          );
          campaign_exist["Beneficiaries"].forEach(async (beneficiary) => {
            const user = await beneficiary.getUser();
            const user_wallet = await user.getWallet({
              where: { CampaignId: campaign_exist.id },
            });

            await campaign_exist
              .createTransaction({
                walletSenderId: wallet[0].uuid,
                walletRecieverId: user_wallet[0].uuid,
                amount: amount,
                narration:
                  "Approved Spending for " +
                  user.first_name +
                  " " +
                  user.last_name,
              })
              .then((transaction) => {
                approveToSpendQueue.send(
                  new Message(
                    {
                      reciever: user_wallet[0].address,
                      campaign: campaign_exist.id,
                      ngoAddress: wallet[0].address,
                      ngoPrivateKey: wallet[0].privateKey,
                      transactionId: transaction.uuid,
                      amount: amount,
                    },
                    { contentType: "application/json" }
                  )
                );
              })
              .catch((err) => {
                console.log(err.message);
              });
          });
          util.setSuccess(201, "Transactions Initiated Successfully");
          return util.send(res);
        } else {
          util.setError(422, "Budget is greater than wallet Balance");
          return util.send(res);
        }
      } else {
        util.setError(422, "Invalid Campaign Id");
        return util.send(res);
      }
    } catch (error) {
      util.setError(400, error.message);
      return util.send(res);
    }
  }
  static async addCampaign(req, res) {
    if (!req.body.title || !req.body.budget || !req.body.start_date) {
      util.setError(400, "Please Provide complete details");
      return util.send(res);
    }
    const newCampaign = req.body;
    newCampaign.status = 1;
    newCampaign.location = JSON.stringify(req.body.location);
    // newCampaign.type = 1;
    try {
      const createdCampaign = await CampaignService.addCampaign(newCampaign);
      util.setSuccess(201, "Campaign Created Successfully!", createdCampaign);
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
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }
    try {
      const updateCampaign = await CampaignService.updateCampaign(
        id,
        alteredCampaign
      );
      if (!updateCampaign) {
        util.setError(404, `Cannot find Campaign with the id: ${id}`);
      } else {
        util.setSuccess(200, "Campaign updated", updateCampaign);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async getACampaign(req, res) {
    const { id } = req.params;
    if (!Number(id)) {
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }

    try {
      const theCampaign = await db.Campaign.findOne({
        where: { id, type: "campaign" },
        include: {
          model: db.Beneficiaries,
          as: "Beneficiaries",
          attributes: { exclude: ["CampaignId"] },
          include: {
            model: db.User,
            as: "User",
            where: { status: "activated" },
            attributes: {
              exclude: [
                "nfc",
                "password",
                "dob",
                "profile_pic",
                "location",
                "is_email_verified",
                "is_phone_verified",
                "is_bvn_verified",
                "is_self_signup",
                "is_public",
                "is_tfa_enabled",
                "last_login",
                "tfa_secret",
                "bvn",
                "nin",
                "pin",
              ],
            },
          },
        },
      });
      if (!theCampaign) {
        util.setError(404, `Cannot find Campaign with the id ${id}`);
      } else {
        util.setSuccess(200, "Found Campaign", theCampaign);
      }
      return util.send(res);
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
  }

  static async deleteCampaign(req, res) {
    const { id } = req.params;
    if (!Number(id)) {
      util.setError(400, "Please provide a numeric value");
      return util.send(res);
    }

    try {
      const CampaignToDelete = await CampaignService.deleteCampaign(id);
      if (CampaignToDelete) {
        util.setSuccess(200, "Campaign deleted");
      } else {
        util.setError(404, `Campaign with the id ${id} cannot be found`);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
  static async complaints(req, res) {
    const campaign = req.params.campaignId;
    let campaignExist = await db.Campaign.findByPk(campaign);
    if (!campaignExist) {
      util.setError(422, "Campaign Invalid");
      return util.send(res);
    }
    const beneficiaries = await campaignExist.getBeneficiaries();

    const finalData = beneficiaries.map((beneficiary) => {
      return beneficiary.id;
    });

    var whereCondtion = {
      BeneficiaryId: {
        [Op.or]: finalData,
      },
    };
    if (req.query.status) {
      whereCondtion["status"] = req.query.status;
    }
    const page_val = req.query.page ? req.query.page : 1;
    const options = {
      page: page_val,
      paginate: 10,
      where: whereCondtion,
      order: [["id", "DESC"]],
    };
    const { docs, pages, total } = await db.Complaints.paginate(options);
    var nextPage = null;
    var prevPage = null;
    if (page_val != pages) {
      nextPage = Number(page_val) + 1;
    }

    if (page_val != 1) {
      prevPage = Number(page_val) - 1;
    }

    util.setSuccess(200, "Complaints Retrieved", {
      complaints: docs,
      current_page: options.page,
      pages: pages,
      total: total,
      nextPage: nextPage,
      prevPage: prevPage,
    });
    return util.send(res);
  }
}

async function loopCampaigns(campaignId, beneficiaries) {
  try {
    for (let i = 0; i < beneficiaries.length; i++) {
      beneficiaries[i]["CampaignId"] = campaignId;
    }
    return beneficiaries;
  } catch (error) {
    return error;
  }
}

module.exports = CampaignsController;
