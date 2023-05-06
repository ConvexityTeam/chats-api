const db = require('../models');
const {util, Response} = require('../libs');
const {HttpStatusCode} = require('../utils');
const Validator = require('validatorjs');
const uploadFile = require('./AmazonController');
const {
  UserService,
  OrganisationService,
  VendorService,
  BeneficiaryService,
  CampaignService,
  TransactionService,
  BlockchainService
} = require('../services');
const {SanitizeObject} = require('../utils');
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';
const axios = require('axios');
const {termiiConfig} = require('../config');
const {async} = require('regenerator-runtime');
const MailerService = require('../services/MailerService');
const SmsService = require('../services/SmsService');
const {AclRoles} = require('../utils');

class AdminController {
  static async updateUserStatus(req, res) {
    const data = req.body;
    const rules = {
      userId: 'required|numeric',
      status: 'required|string|in:activated,suspended,pending'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const userExist = await db.User.findOne({where: {id: data.userId}});
      if (userExist) {
        await userExist.update({status: data.status}).then(response => {
          util.setError(200, 'User Updated');
          return util.send(res);
        });
      } else {
        util.setError(404, 'Invalid User Id', error);
        return util.send(res);
      }
    }
  }

  static async updateCampaignStatus(req, res) {
    const data = req.body;
    const rules = {
      campaignId: 'required|numeric',
      status: 'required|string|in:in-progress,paused,pending'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: {id: data.campaignId}
      });
      if (campaignExist) {
        await campaignExist.update({status: data.status}).then(response => {
          util.setError(200, 'Campaign Status Updated');
          return util.send(res);
        });
      } else {
        util.setError(404, 'Invalid Campaign Id', error);
        return util.send(res);
      }
    }
  }

  static async verifyAccount(req, res) {
    try {
      const {userprofile_id} = req.params;
      const data = req.body;
      data.country = 'Nigeria';
      data.currency = 'NGN';
      const rules = {
        first_name: 'required|string',
        last_name: 'required|string',
        nin_image_url: 'required|url',
        gender: 'required|in:male,female',
        address: 'string',
        location: 'string',
        dob: 'string',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        nin: 'required|digits_between:10,11',
        marital_status: 'string'
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      if (!req.file) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Upload Selfie`);
        return Response.send(res);
      }
      const organisation = await OrganisationService.findOneById(
        userprofile_id
      );
      if (!organisation) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Organisation Not Found`
        );
        return Response.send(res);
      }

      await db.User.update(
        {
          profile_pic: data.nin_image_url,
          ...data,
          status: 'activated',
          is_nin_verified: true
        },
        {where: {id: organisation.id}}
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `NIN Verified`,
        organisation
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error Try Again: ${error}`
      );
      return Response.send(res);
    }
  }

  static async getAllNGO(req, res) {
    try {
      const allNGOs = await OrganisationService.getAllOrganisations();

      for (let user of allNGOs) {
        for (let ngo of user.Organisation) {
          const sum = ngo.Transactions.reduce((accumulator, object) => {
            return accumulator + object.amount;
          }, 0);
          let count = 0;
          for (let campaign of ngo.Campaigns) {
            let beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
              campaign.id
            );
            count = count + beneficiaries.length;
          }
          ngo.dataValues.beneficiary_count = count;
          ngo.dataValues.disbursedSum = sum;
          delete ngo.dataValues.Transactions;
          delete ngo.dataValues.Campaigns;
        }
      }
      if (allNGOs.length > 0) {
        Response.setSuccess(200, 'NGOs retrieved', allNGOs);
      } else {
        Response.setSuccess(200, 'No NGO found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getNGODisbursedAndBeneficiaryTotal(req, res) {
    const {organisation_id} = req.params;

    try {
      let total = await TransactionService.getTotalTransactionAmountAdmin(
        organisation_id
      );
      const beneficiaries = await BeneficiaryService.findOrgnaisationBeneficiaries(
        organisation_id
      );
      const beneficiariesCount = Object.keys(beneficiaries).length;

      let spend_for_campaign = total.map(a => a.dataValues.amount);
      let disbursedSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        disbursedSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Disbursed and Beneficiaries total retrieved', {
        disbursedSum,
        beneficiariesCount
      });

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getAllVendors(req, res) {
    try {
      const allVendors = await VendorService.getAllVendorsAdmin();
      Response.setSuccess(200, 'Vendors retrieved', allVendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getVendorCampaignAndAmountTotal(req, res) {
    const {vendor_id} = req.params;
    try {
      const transactions = await VendorService.vendorsTransactionsAdmin(
        vendor_id
      );
      const campaigns = await CampaignService.getVendorCampaignsAdmin(
        vendor_id
      );
      const campaignsCount = Object.keys(campaigns).length;

      let spend_for_campaign = transactions.map(a => a.dataValues.amount);
      let amount_sold = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        amount_sold += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Campaign and amount sold total retrieved', {
        amount_sold,
        campaignsCount
      });

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getAllBeneficiaries(req, res) {
    try {
      const allBeneficiaries = await BeneficiaryService.getBeneficiariesAdmin();
      Response.setSuccess(200, 'Beneficiaries retrieved', allBeneficiaries);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getBeneficiaryAmountAndCampaignsTotal(req, res) {
    const {beneficiary_id} = req.params;

    try {
      let total = await TransactionService.getBeneficiaryTotalTransactionAmountAdmin(
        beneficiary_id
      );
      const campaigns = await CampaignService.beneficiaryCampaingsAdmin(
        beneficiary_id
      );
      const campaignCount = Object.keys(campaigns).length;

      let spend_for_campaign = total.map(a => a.dataValues.amount);
      let spentSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        spentSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Spent and campaign total retrieved', {
        spentSum,
        campaignCount
      });

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
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
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign retrieved',
        allCampaign
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async getAllDonors(req, res) {
    try {
      const allDonors = await OrganisationService.getAllDonorsAdmin();
      if (allDonors.length > 0) {
        Response.setSuccess(200, 'Donors retrieved', allDonors);
      } else {
        Response.setSuccess(200, 'No Donors found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getDonorCampaignCount(req, res) {
    try {
      const userId = await db.User.findOne({
        where: {
          id: req.params.donor_id
        }
      });

      const donor = await db.Organisation.findOne({
        where: {
          email: userId.email
        }
      });

      if (!donor) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'User not a donor'
        );
        return Response.send(res);
      }

      let total = await TransactionService.getTotalTransactionAmountAdmin(
        donor.id
      );
      const campaigns = await CampaignService.getPrivateCampaignsAdmin(
        donor.id
      );
      // const campaignsCount = Object.keys(campaigns).length

      let spend_for_campaign = total.map(a => a.dataValues.amount);
      let disbursedSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        disbursedSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', {
        disbursedSum,
        campaigns
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }
}

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin
    }
  });
  let resp;
  await axios
    .get(
      `https://api.ng.termii.com/api/get-balance?api_key=${termiiConfig.api_key}`
    )
    .then(async result => {
      resp = result.data;
      if (resp.balance <= 100) {
        await SmsService.sendAdminSmsCredit(user.phone, resp.balance);
        await MailerService.sendAdminSmsCreditMail(user.email, resp.balance);
        console.log('SMS balance is getting low');
      }
    })
    .catch(error => {
      console.log('error', error.message);
    });
}, 3600000);

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin
    }
  });

  const options = {
    port: 443,
    method: 'GET',
    headers: {
      'x-api-key': ` ${process.env.IDENTITY_API_KEY}`
    }
  };

  await axios
    .get(
      'https://api.myidentitypay.com/api/v1/biometrics/merchant/data/wallet/balance',
      options
    )
    .then(async result => {
      let resp;
      resp = result.data;
      if (resp.balance <= 4000) {
        await SmsService.sendAdminNinCredit(user.phone, resp.balance);
        await MailerService.sendAdminNinCreditMail(user.email, resp.balance);
        console.log('NIN balance is getting low');
      }
    })
    .catch(error => {
      console.log('error', error.message);
    });
}, 3600000);

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin
    }
  });
  if (process.env.NODE_ENV == 'production') {
    const balance = await BlockchainService.getNativeBalance(
      '0x9bd10E18842Eabe5Bd2ef3B12c831647FC84BF63'
    );
    if (parseInt(balance) < 2) {
      await MailerService.sendAdminBlockchainCreditMail(user.email, balance);
      await SmsService.sendAdminBlockchainCredit(user.phone, balance);
      console.log('Blockchain gas is getting low');
    } else {
      console.log('Blockchain gas is funded');
    }
  }
}, 3600000);

module.exports = AdminController;
