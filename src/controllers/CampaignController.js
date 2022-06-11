const {
  CampaignService,
  ComplaintService,
  BeneficiaryService,
  OrganisationService,
  SmsService,
  QueueService,
  UserService,
  WalletService,
  TaskService
} = require("../services");

const db = require("../models");
const {
  Op
} = require("sequelize");
const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const {
  Response
} = require("../libs");
const {
  HttpStatusCode,
  SanitizeObject,
  generateQrcodeURL,
  GenearteVendorId,
  GenearteSMSToken,
  AclRoles
} = require("../utils");

const amqp_1 = require("../libs/RabbitMQ/Connection");
const approveToSpendQueue = amqp_1["default"].declareQueue("approveToSpend", {
  durable: true,
});
const createWalletQueue = amqp_1["default"].declareQueue("createWallet", {
  durable: true,
});

class CampaignController {
  static async addBeneficiaryComplaint(req, res) {
    try {
      const {
        report
      } = SanitizeObject(req.body, ['report']);
      const UserId = req.user.id;
      const complaint = await ComplaintService.createComplaint({
        CampaignId: req.campaign.id,
        UserId,
        report
      });
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Complaint Submitted.', complaint);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal error occured. Please try again.');
      return Response.send(res);
    }
  }

  static async getBeneficiaryCampaignComplaint(req, res) {
    try {
      const filter = SanitizeObject(req.query, ['status']);
      const Campaign = req.campaign.toJSON();
      filter.CampaignId = Campaign.id;
      const {
        count: complaints_count,
        rows: Complaints
      } = await ComplaintService.getBeneficiaryComplaints(req.user.id, filter);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Campaign Complaints.', {
        ...Campaign,
        complaints_count,
        Complaints
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal error occured. Please try again.');
      return Response.send(res);
    }
  }

  static async getBeneficiaryCampaigns(req, res) {
    try {
      const filter = SanitizeObject(req.query, ['status', 'type']);
      const campaigns = await CampaignService.beneficiaryCampaings(req.user.id, filter);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Campaigns.', campaigns);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal error occured. Please try again.');
      return Response.send(res);
    }
  }

  static async getAllCampaigns(req, res) {
    try {
      const query = SanitizeObject(req.query, ['type']);
      const allCampaign = await CampaignService.getAllCampaigns({
        ...query,
        status: 'active'
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, "Campaign retrieved", allCampaign);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal error occured. Please try again.');
      return Response.send(res);
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
        where: {
          id: OrganisationId
        },
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
        Response.setSuccess(200, "Campaigns Retrieved", campaignsArray);
        return Response.send(res);
      } else {
        Response.setError(422, "Invalid Organisation Id");
        return Response.send(res);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }
  static async beneficiariesToCampaign(req, res) {
    try {
      const campaign_exist = await db.Campaign.findOne({
        where: {
          id: req.params.campaignId,
          type: "campaign"
        },
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
                new Message({
                  id: element,
                  campaign: req.params.campaignId,
                  type: "user",
                }, {
                  contentType: "application/json"
                })
              );
            });
          });

          Response.setSuccess(201, "Beneficiaries Added To Campaign Successfully");
          return Response.send(res);
        } else {
          Response.setError(
            422,
            "Some User(s) has already been added as Beneficiaries to the campaign"
          );
          return Response.send(res);
        }
      } else {
        Response.setError(422, "Invalid Campaign Id");
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  /**
   * Funding of Beneficiaries Wallet
   * @param req http request header
   * @param res http response header
   * @async
   */

  // REFACTORED
  static async approveAndFund(req, res) {
    const {organisation_id, campaign_id} = req.params;
    try {

      // const campaign = req.campaign;
      // const organisation = req.organisation;
      // const campaignWallet = await campaign.getWallet();
      // const OrgWallet = await organisation.getWallet();
    
      const beneficiaries = await BeneficiaryService.getApprovedBeneficiaries(campaign_id);
      const campaign = await CampaignService.getCampaignWallet(campaign_id, organisation_id);
      const campaignWallet = campaign.Wallet
      const organisation = await OrganisationService.getOrganisationWallet(organisation_id);
      const OrgWallet = organisation.Wallet

      if(campaign.status == 'completed') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign already completed');
        return Response.send(res);
      }
      if(campaign.status == 'ongoing') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign already ongoing');
        return Response.send(res);
      }

      if((campaign.budget > OrgWallet.balance) || (OrgWallet.balance == 0)) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Insufficient wallet balance. Please fund organisation wallet.');
        return Response.send(res);
      }
      if(campaign.type === 'campaign' && !beneficiaries.length) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign has no approved beneficiaries. Please approve beneficiaries.');
        return Response.send(res);
      } 
      QueueService.CampaignApproveAndFund({campaign, campaignWallet, OrgWallet, beneficiaries, token_type: req.body.token_type});
     //const funding = await CampaignService.handleCampaignApproveAndFund(campaign, campaignWallet, OrgWallet, beneficiaries);
      Response.setSuccess(HttpStatusCode.STATUS_OK, `Campaign approved and funded for ${beneficiaries.length} beneficiaries.`, beneficiaries);
      return Response.send(res);
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }

  static async rejectSubmission (req, res){
    const {taskAssignmentId} = req.params
    try{
      const assignment = await db.TaskAssignment.findByPk(taskAssignmentId)
      if(!assignment){
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Task Assignment Not Found');
        return Response.send(res);
      }
      if(!assignment.uploaded_evidence){
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Kindly upload evidence');
        return Response.send(res);
      }
     const updated =  await db.TaskAssignment.update({status: 'rejected'}, {where: {id: taskAssignmentId}})
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Task rejected', updated);
        return Response.send(res);
    }catch(error){
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }

  static async fundApprovedBeneficiary (req, res){
    const {organisation_id, campaign_id} = req.params;
    const {beneficiaryId, taskAssignmentId} = req.body

    try{
      const campaign = await CampaignService.getCampaignWallet(campaign_id, organisation_id);
      const campaignWallet = campaign.Wallet
      const organisation = await OrganisationService.getOrganisationWallet(organisation_id);
      const OrgWallet = organisation.Wallet
      const beneficiaryWallet = await WalletService.findUserCampaignWallet(beneficiaryId, campaign_id);
      const task_assignment = await db.TaskAssignment.findByPk(taskAssignmentId)
      const task = await db.Task.findOne({where:{id: task_assignment.TaskId}})
    
      const amount_disburse = task.amount / task.assignment_count
      if(!task_assignment){
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, `Task Assignment Not Found`, task_assignment);
      return Response.send(res);
      }

      if((amount_disburse > campaign.budget)) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Insufficient wallet balance. Please fund organisation wallet.');
        return Response.send(res);
      }
      
      const transaction = await QueueService.FundBeneficiary(beneficiaryWallet, campaignWallet, task_assignment, amount_disburse)
      Response.setSuccess(HttpStatusCode.STATUS_OK, `Beneficiary Funded.`, transaction);
      return Response.send(res);
    }catch(error){
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }
  static async sendSMStoken(req, res){
     
    try{
    const beneficiary = req.body.beneficiaryIds

     const user = await UserService.getAllUsers()
      let foundbeneneficiary = []
     const tokens = await db.VoucherToken.findAll()
        beneficiary.forEach((data) => {
      var phone = user.filter((user) => user.id === data);
        foundbeneneficiary.push(phone[0])
});

tokens.forEach((data) => {
 foundbeneneficiary.map((user) => {
        SmsService.sendOtp(user.phone, `Hello ${user.first_name || user.last_Name ?user.first_name  +" "+ user.last_Name: ''} your convexity token is ${data.token}, you are approved to spend ${data.amount}`)

  })
   
  })



Response.setSuccess(HttpStatusCode.STATUS_OK, `SMS token sent to ${foundbeneneficiary.length} beneficiaries.`, foundbeneneficiary);
      return Response.send(res);
    }catch(error){
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }

  static async campaignTokens (req, res){
    const {campaign_id, page,organisation_id, token_type} = req.params
    const OrganisationId = organisation_id

   let limit = 10;
  let offset = 0;
  
    let where = {
      'tokenType': token_type,
      organisationId: OrganisationId,
      campaignId: campaign_id
    }
    try{
     const tokencount = await db.VoucherToken.findAndCountAll({where})
     const user = await UserService.getAllUsers()
     const campaign = await CampaignService.getAllCampaigns({OrganisationId})
    
     let pages = Math.ceil(tokencount.count / limit)
     offset = limit * (page - 1)
     const tokens = await db.VoucherToken.findAll({where, limit, offset, order: [['updatedAt', 'ASC']]})
      tokens.forEach((data) => {
      var filteredKeywords = user.filter((user) => user.id === data.beneficiaryId);
        data.dataValues.Beneficiary = filteredKeywords[0]
});
tokens.forEach((data) => {
      var filteredKeywords = user.filter((user) => user.id === data.beneficiaryId);
        data.dataValues.Beneficiary = filteredKeywords[0]
});

tokens.forEach((data) => {
      var filteredKeywords = campaign.filter((camp) => camp.id === data.campaignId);
        data.dataValues.Campaign = filteredKeywords[0]
});



     Response.setSuccess(HttpStatusCode.STATUS_OK, `Found ${tokens.length} ${token_type}.`, {tokens, page_count: pages, });
      return Response.send(res);
    }catch(error){
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  } 
  static async addCampaign(req, res) {
    if (!req.body.title || !req.body.budget || !req.body.start_date) {
      Response.setError(400, "Please Provide complete details");
      return Response.send(res);
    }
    const newCampaign = req.body;
    newCampaign.status = 1;
    newCampaign.location = JSON.stringify(req.body.location);
    // newCampaign.type = 1;
    try {
      const createdCampaign = await CampaignService.addCampaign(newCampaign);
      Response.setSuccess(201, "Campaign Created Successfully!", createdCampaign);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  static async updatedCampaign(req, res) {
    const alteredCampaign = req.body;
    const {
      id
    } = req.params;
    if (!Number(id)) {
      Response.setError(400, "Please input a valid numeric value");
      return Response.send(res);
    }
    try {
      const updateCampaign = await CampaignService.updateCampaign(
        id,
        alteredCampaign
      );
      if (!updateCampaign) {
        Response.setError(404, `Cannot find Campaign with the id: ${id}`);
      } else {
        Response.setSuccess(200, "Campaign updated", updateCampaign);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(404, error);
      return Response.send(res);
    }
  }

  static async getACampaign(req, res) {
    const {
      id
    } = req.params;
    if (!Number(id)) {
      Response.setError(400, "Please input a valid numeric value");
      return Response.send(res);
    }

    try {
      const theCampaign = await db.Campaign.findOne({
        where: {
          id,
          type: "campaign"
        },
        include: {
          model: db.Beneficiaries,
          as: "Beneficiaries",
          attributes: {
            exclude: ["CampaignId"]
          },
          include: {
            model: db.User,
            as: "User",
            where: {
              status: "activated"
            },
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
        Response.setError(404, `Cannot find Campaign with the id ${id}`);
      } else {
        Response.setSuccess(200, "Found Campaign", theCampaign);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(500, error);
      return Response.send(res);
    }
  }

  static async deleteCampaign(req, res) {
    const {
      id
    } = req.params;
    if (!Number(id)) {
      Response.setError(400, "Please provide a numeric value");
      return Response.send(res);
    }

    try {
      const CampaignToDelete = await CampaignService.deleteCampaign(id);
      if (CampaignToDelete) {
        Response.setSuccess(200, "Campaign deleted");
      } else {
        Response.setError(404, `Campaign with the id ${id} cannot be found`);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }
  static async complaints(req, res) {
    const campaign = req.params.campaignId;
    let campaignExist = await db.Campaign.findByPk(campaign);
    if (!campaignExist) {
      Response.setError(422, "Campaign Invalid");
      return Response.send(res);
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
      order: [
        ["id", "DESC"]
      ],
    };
    const {
      docs,
      pages,
      total
    } = await db.Complaints.paginate(options);
    var nextPage = null;
    var prevPage = null;
    if (page_val != pages) {
      nextPage = Number(page_val) + 1;
    }

    if (page_val != 1) {
      prevPage = Number(page_val) - 1;
    }

    Response.setSuccess(200, "Complaints Retrieved", {
      complaints: docs,
      current_page: options.page,
      pages: pages,
      total: total,
      nextPage: nextPage,
      prevPage: prevPage,
    });
    return Response.send(res);
  }

  static async getCampaign(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const OrganisationId = req.params.organisation_id
      const campaign = await CampaignService.getCampaignWithBeneficiaries(campaignId);
      const campaignWallet = await WalletService.findOrganisationCampaignWallet(OrganisationId,campaignId)
      let completed_task = []
      if(!campaignWallet){
       await QueueService.createWallet(OrganisationId, 'organisation', campaignId);
      }
      if(campaign.Beneficiaries){
      campaign.Beneficiaries.forEach(async(data)=> {
        const userWallet = await WalletService.findUserCampaignWallet(data.id, campaignId)
        if(!userWallet){
        await QueueService.createWallet(data.id, 'user', campaignId);
        }
      })
    }
    if(campaign.Jobs){
      campaign.Jobs.forEach(async(data)=> {
     let assignment = await db.TaskAssignment.findAll({where: {TaskId: data.id, status: 'completed'}})
      if(assignment){
        campaign.dataValues.completed_task = assignment.length
      }
    })
    }
 
    campaign.dataValues.beneficiaries_count = campaign.Beneficiaries.length
      campaign.dataValues.task_count = campaign.Jobs.length
      campaign.dataValues.beneficiary_share = campaign.dataValues.beneficiaries_count > 0 ? (campaign.budget / campaign.dataValues.beneficiaries_count).toFixed(2) : 0;
      campaign.dataValues.amount_spent = (campaign.amount_disbursed - campaign.BeneficiariesWallets.map(balance => balance).reduce((a, b) => a + b, 0)).toFixed(2)
      campaign.dataValues.Complaints = await CampaignService.getCampaignComplaint(campaignId);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Details', campaign);
      return Response.send(res);
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, `Internal server error. Contact support.`+ error);
      return Response.send(res);
    }
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

module.exports = CampaignController;