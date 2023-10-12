require('dotenv').config();
const Validator = require('validatorjs');
const axios = require('axios');
const db = require('../models');
const { util, Response } = require('../libs');
const { HttpStatusCode, GenearteVendorId } = require('../utils');
const {
  UserService,
  OrganisationService,
  VendorService,
  BeneficiaryService,
  CampaignService,
  TransactionService,
  BlockchainService,
} = require('../services');
const { SanitizeObject } = require('../utils');

const { termiiConfig } = require('../config');
const MailerService = require('../services/MailerService');
const SmsService = require('../services/SmsService');
const { AclRoles } = require('../utils');

class AdminController {
  static async testEmail(res) {
    try {
      const vendor_id = GenearteVendorId();
      MailerService.verify(
        'jibrilmohammed39@gmail.com',
        'Jibril mohammed',
        vendor_id,
        'password',
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Email verified',
        vendor_id,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Contact support.',
      );
      return Response.send(res);
    }
  }

  static async updateStatus(req, res) {
    const data = req.body;

    try {
      const rules = {
        userId: 'required|numeric',
        status: 'required|string|in:activated,suspended',
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const bodyAllowedList = new Set(['userId', 'status']);

      const bodyProperties = Object.keys(req.body);

      bodyProperties.forEach((prop) => {
        if (!bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Unexpected parameter in POST body',
          );
          return Response.send(res);
        }
        return null;
      });

      const userExist = await db.User.findOne({ where: { id: data.userId } });

      if (!userExist) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Invalid user ID',
        );
        return Response.send(res);
      }
      // userExist.dataValues.is_verified_all = true;
      const updatesUser = await userExist.update({
        status: data.status,
        is_verified_all: true,
      });

      const to = userExist.email;
      // const OrgName = userExist.;
      const OrgName = '';
      if (updatesUser && data.status === 'activated') {
        // send email notification to user
        await MailerService.ngoApprovedMail(to, OrgName);
      }
      updatesUser.dataValues.password = null;
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'User status updated');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Contact support.',
      );
      return Response.send(res);
    }
  }

  static async updateCampaignStatus(req, res) {
    const data = req.body;
    const rules = {
      campaignId: 'required|numeric',
      status: 'required|string|in:in-progress,paused,pending',
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    }
    const campaignExist = await db.Campaign.findOne({
      where: { id: data.campaignId },
    });
    if (campaignExist) {
      await campaignExist.update({ status: data.status }).then(() => {
        util.setError(200, 'Campaign Status Updated');
        return util.send(res);
      });
    } else {
      util.setError(404, 'Invalid Campaign Id');
      return util.send(res);
    }
    return null;
  }

  static async verifyAccount(req, res) {
    try {
      const { userprofile_id } = req.params;
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
        marital_status: 'string',
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      if (!req.file) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Upload Selfie');
        return Response.send(res);
      }
      const organisation = await OrganisationService.findOneById(
        userprofile_id,
      );
      if (!organisation) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Organisation Not Found',
        );
        return Response.send(res);
      }

      await db.User.update(
        {
          profile_pic: data.nin_image_url,
          ...data,
          status: 'activated',
          is_nin_verified: true,
        },
        { where: { id: organisation.id } },
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'NIN Verified',
        organisation,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error Try Again: ${error}`,
      );
      return Response.send(res);
    }
  }

  static async getAllNGO(req, res) {
    try {
      const allNGOs = await OrganisationService.getAllOrganisations();
      const ngoPromises = allNGOs.map(async (ngo) => {
        const [transactions, campaigns] = await Promise.all([
          TransactionService.findTransactions({
            OrganisationId: ngo.id,
            transaction_type: 'transfer',
            status: 'success',
            VendorId: null,
            BeneficiaryId: null,
          }),
          CampaignService.getCampaigns(ngo.id, {
            is_funded: true,
          }),
        ]);

        const sum = transactions.reduce((accumulator, object) => accumulator + object.amount, 0);
        const { status, id: UserId, liveness } = await UserService.findUser(ngo.Members[0].UserId);
        // const name = ngo.name || `${user.first_name} ${user.last_name}`;

        const beneficiaryCounts = await Promise.all(campaigns.data.map(async (campaign) => {
          const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
            campaign.id,
            req.query,
          );
          return beneficiaries.data.length;
        }));

        const beneficiary_count = beneficiaryCounts
          .reduce((accumulator, count) => accumulator + count, 0);

        return {
          ...ngo,
          dataValues: {
            ...ngo.dataValues,
            name: ngo.name,
            status,
            UserId,
            liveness,
            beneficiary_count,
            disbursedSum: sum,
          },
        };
      });

      const ngoResults = await Promise.all(ngoPromises);

      if (ngoResults.length > 0) {
        Response.setSuccess(200, 'NGOs retrieved', ngoResults);
      } else {
        Response.setSuccess(200, 'No NGO found');
      }

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error.${error}`,
      );
      return Response.send(res);
    }
  }

  // static async getAllNGO(req, res) {
  //   try {
  //     const allNGOs = await OrganisationService.getAllOrganisations();

  //     for (const ngo of allNGOs) {
  //       const [transactions, campaigns] = await Promise.all([
  //         TransactionService.findTransactions({
  //           OrganisationId: ngo.id,
  //           transaction_type: 'transfer',
  //           status: 'success',
  //           VendorId: null,
  //           BeneficiaryId: null,
  //         }),
  //         CampaignService.getCampaigns(ngo.id, {
  //           is_funded: true,
  //         }),
  //       ]);

  //       const sum = transactions.reduce((accumulator, object) => accumulator + object.amount, 0);
  //       let count = 0;
  //       const user = await UserService.findUser(ngo.Members[0].UserId);
  //       ngo.dataValues.name = ngo.name || `${user.first_name} ${user.last_name}`;
  //       ngo.dataValues.status = user.status;
  //       ngo.dataValues.UserId = user.id;
  //       ngo.dataValues.liveness = user.liveness;

  //       for (const campaign of campaigns.data) {
  //         const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
  //           campaign.id,
  //           req.query,
  //         );
  //         count += beneficiaries.data.length;
  //       }
  //       ngo.dataValues.beneficiary_count = count;
  //       ngo.dataValues.disbursedSum = sum;
  //       delete ngo.dataValues.Transactions;
  //       delete ngo.dataValues.Campaigns;
  //       delete ngo.dataValues.Members;
  //     }

  //     if (allNGOs.length > 0) {
  //       Response.setSuccess(200, 'NGOs retrieved', allNGOs);
  //     } else {
  //       Response.setSuccess(200, 'No NGO found');
  //     }
  //     return Response.send(res);
  //   } catch (error) {
  //     console.log(error);
  //     Response.setError(
  //       HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
  //       `Internal Server Error.${error}`,
  //     );
  //     return Response.send(res);
  //   }
  // }

  static async fetchLiveness(req, res) {
    try {
      const liveness = await UserService.fetchLiveness();
      Response.setSuccess(200, 'Liveness retrieved', liveness);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error.',
      );
      return Response.send(res);
    }
  }

  static async findLiveness(req, res) {
    try {
      const liveness = await UserService.findLivenessByUserId(
        req.params.user_id,
      );
      Response.setSuccess(200, 'Liveness retrieved', liveness);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error.',
      );
      return Response.send(res);
    }
  }

  static async updateUserStatus(req, res) {
    try {
      const allNGOs = await OrganisationService.getAllOrganisations();

      allNGOs.forEach(async (ngo) => {
        const ngoCopy = { ...ngo };
        const sum = ngo.Transactions
          .reduce((accumulator, object) => accumulator + object.amount, 0);
        let count = 0;
        const user = await UserService.findUser(ngo.Members[0].UserId);
        ngoCopy.dataValues.status = user.status;
        ngoCopy.dataValues.UserId = user.id;

        ngo.Campaigns.forEach(async (campaign) => {
          const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
            campaign.id,
            req.query,
          );
          count += beneficiaries.data.length;
        });
        ngoCopy.dataValues.beneficiary_count = count;
        ngoCopy.dataValues.disbursedSum = sum;
        delete ngoCopy.dataValues.Transactions;
        delete ngoCopy.dataValues.Campaigns;
        delete ngoCopy.dataValues.Members;
      });

      if (allNGOs.length > 0) {
        Response.setSuccess(200, 'NGOs retrieved', allNGOs);
      } else {
        Response.setSuccess(200, 'No NGO found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error.',
      );
      return Response.send(res);
    }
  }

  static async getNGODisbursedAndBeneficiaryTotal(req, res) {
    const { organisation_id } = req.params;

    try {
      const total = await TransactionService.getTotalTransactionAmountAdmin(
        organisation_id,
      );
      const beneficiaries = await BeneficiaryService.findOrgnaisationBeneficiaries(organisation_id);
      const beneficiariesCount = Object.keys(beneficiaries).length;

      const spend_for_campaign = total.map((a) => a.dataValues.amount);
      let disbursedSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i += 1) {
        disbursedSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Disbursed and Beneficiaries total retrieved', {
        disbursedSum,
        beneficiariesCount,
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

      allVendors.forEach(async (vendor) => {
        const vendorCopy = { ...vendor };
        const sum = vendor.StoreTransactions
          .reduce((accumulator, object) => accumulator + object.amount, 0);
        const campaign = await CampaignService.getVendorCampaigns(vendor.id);
        vendorCopy.dataValues.total_amount_sold = sum;
        vendorCopy.dataValues.total_campaign = campaign.length || null;
        vendorCopy.dataValues.total_ngos = vendor.Organisations.length;
        delete vendorCopy.dataValues.Organisations;
        delete vendorCopy.dataValues.StoreTransactions;
      });

      Response.setSuccess(200, 'Vendors retrieved', allVendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error${error}`,
      );
      return Response.send(res);
    }
  }

  static async getVendorCampaignAndAmountTotal(req, res) {
    const { vendor_id } = req.params;
    try {
      const transactions = await VendorService.vendorsTransactionsAdmin(
        vendor_id,
      );
      const campaigns = await CampaignService.getVendorCampaignsAdmin(
        vendor_id,
      );
      const campaignsCount = Object.keys(campaigns).length;

      const spend_for_campaign = transactions.map((a) => a.dataValues.amount);
      let amount_sold = 0;
      for (let i = 0; i < spend_for_campaign.length; i += 1) {
        amount_sold += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Campaign and amount sold total retrieved', {
        amount_sold,
        campaignsCount,
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

      allBeneficiaries.forEach(async (beneficiary) => {
        const beneficiaryCopy = { ...beneficiary };
        const sum = beneficiary.OrderTransaction.reduce(
          (accumulator, object) => accumulator + object.amount,
          0,
        );
        const campaign = await BeneficiaryService.findCampaignBeneficiary(
          beneficiary.id,
        );
        const ngo = await CampaignService.getCampaignWithBeneficiaries(
          campaign[0].CampaignId,
        );
        beneficiaryCopy.dataValues.total_amount_spent = sum;
        beneficiaryCopy.dataValues.total_campaign = campaign.length;
        beneficiaryCopy.dataValues.organisationId = ngo.OrganisationId;
        delete beneficiaryCopy.dataValues.OrderTransaction;
      });

      Response.setSuccess(200, 'Beneficiaries retrieved', allBeneficiaries);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getBeneficiaryAmountAndCampaignsTotal(req, res) {
    const { beneficiary_id } = req.params;

    try {
      const total = await TransactionService.getBeneficiaryTotalTransactionAmountAdmin(
        beneficiary_id,
      );
      const campaigns = await CampaignService.beneficiaryCampaingsAdmin(
        beneficiary_id,
      );
      const campaignCount = Object.keys(campaigns).length;

      const spend_for_campaign = total.map((a) => a.dataValues.amount);
      let spentSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i += 1) {
        spentSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Spent and campaign total retrieved', {
        spentSum,
        campaignCount,
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
      });

      allCampaign.forEach(async (campaign) => {
        const campaignCopy = { ...campaign };
        campaignCopy.dataValues.total_amount = campaign.budget;
        campaignCopy.dataValues.total_amount_spent = campaign.amount_disbursed;
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign retrieved',
        allCampaign,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal error occured. Please try again.${error}`,
      );
      return Response.send(res);
    }
  }

  static async getAllDonors(req, res) {
    try {
      const allDonors = await OrganisationService.getAllDonorsAdmin();

      allDonors.forEach(async (donor) => {
        const donorCopy = { ...donor };
        const transactions = await TransactionService.findTransactions({
          OrganisationId: donor.id,
          BeneficiaryId: null,
          transaction_type: 'transfer',
          is_approved: true,
          status: 'success',
        });
        const userExist = await UserService.findByEmail(donor.email);
        const sum = transactions.reduce((accumulator, object) => accumulator + object.amount, 0);
        donorCopy.dataValues.total_campaign = donor.associatedCampaigns.length;
        const ngos = [
          ...new Set(donor.associatedCampaigns.map((item) => item.OrganisationId)),
        ];
        donorCopy.dataValues.total_donation = sum;
        donorCopy.dataValues.total_ngo = ngos.length;
        donorCopy.dataValues.UserId = userExist.id;
        donorCopy.dataValues.status = userExist.status;
        delete donorCopy.dataValues.associatedCampaigns;
      });

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
          id: req.params.donor_id,
        },
      });

      const donor = await db.Organisation.findOne({
        where: {
          email: userId.email,
        },
      });

      if (!donor) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'User not a donor',
        );
        return Response.send(res);
      }

      const total = await TransactionService.getTotalTransactionAmountAdmin(
        donor.id,
      );
      const campaigns = await CampaignService.getPrivateCampaignsAdmin(
        donor.id,
      );
      // const campaignsCount = Object.keys(campaigns).length

      const spend_for_campaign = total.map((a) => a.dataValues.amount);
      let disbursedSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i += 1) {
        disbursedSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', {
        disbursedSum,
        campaigns,
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
      RoleId: AclRoles.SuperAdmin,
    },
  });
  let resp;
  if (process.env.NODE_ENV === 'production') {
    await axios
      .get(
        `https://api.ng.termii.com/api/get-balance?api_key=${termiiConfig.api_key}`,
      )
      .then(async (result) => {
        resp = result.data;
        if (resp.balance <= 100) {
          await SmsService.sendAdminSmsCredit(user.phone, resp.balance);
          await MailerService.sendAdminSmsCreditMail(user.email, resp.balance);
          console.log('SMS balance is getting low');
        }
      })
      .catch((error) => {
        console.log('error', error.message);
      });
  }
}, 86400000);

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin,
    },
  });

  const options = {
    port: 443,
    method: 'GET',
    headers: {
      'x-api-key': ` ${process.env.IDENTITY_API_KEY}`,
    },
  };

  await axios
    .get(
      'https://api.myidentitypay.com/api/v1/biometrics/merchant/data/wallet/balance',
      options,
    )
    .then(async (result) => {
      const resp = result.data;
      if (resp.balance <= 4000) {
        await SmsService.sendAdminNinCredit(user.phone, resp.balance);
        await MailerService.sendAdminNinCreditMail(user.email, resp.balance);
        console.log('NIN balance is getting low');
      }
    })
    .catch((error) => {
      console.log('error', error.message);
    });
}, 3600000);

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin,
    },
  });
  if (process.env.NODE_ENV === 'production') {
    const balance = await BlockchainService.getNativeBalance(
      process.env.BLOCKCHAIN_ADMIN,
    );
    if (parseInt(balance, 10) < 2) {
      await MailerService.sendAdminBlockchainCreditMail(user.email, balance);
      await SmsService.sendAdminBlockchainCredit(user.phone, balance);
      console.log('Blockchain gas is getting low');
    } else {
      console.log('Blockchain gas is funded');
    }
  }
}, 3600000);

module.exports = AdminController;
