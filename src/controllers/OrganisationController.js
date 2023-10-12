const { Op } = require('sequelize');
const moment = require('moment');
const Validator = require('validatorjs');
const formidable = require('formidable');
const fs = require('fs');
const { Message } = require('@droidsolutions-oss/amqp-ts');
const {
  HttpStatusCode,
  SanitizeObject,
  generateOrganisationId,
  generateProductRef,
  GenerateSecrete,
} = require('../utils');

const UserService = require('../services/UserService');
const { Response, Logger } = require('../libs');
const db = require('../models');

const uploadFile = require('./AmazonController');

const amqp = require('../libs/RabbitMQ/Connection');

const BantuService = require('../services');
const api = require('../libs/Axios');
const {
  CampaignService,
  QueueService,
  OrganisationService,
  BeneficiaryService,
  VendorService,
  BlockchainService,
  ProductService,
  ProvidusService,
  WalletService,
  ZohoService,
  TransactionService,
} = require('../services');
const AwsUploadService = require('../services/AwsUploadService');
const campaign = require('../models/campaign');

const transferToQueue = amqp.default.declareQueue('transferTo', {
  durable: true,
});
const mintTokenQueue = amqp.default.declareQueue('mintToken', {
  durable: true,
});

class OrganisationController {
  static logger = Logger;

  static async register(req, res) {
    const data = req.body;
    const rules = {
      name: 'required|string',
      email: 'required|email',
      phone: 'required|string',
      address: 'required|string',
      location: 'required|string',
      logo_link: 'url',
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const organisation = await OrganisationService.checkExistEmail(
      data.email,
    );

    if (organisation) {
      Response.setError(422, 'Email already taken');
      return Response.send(res);
    }
    return null;
  }

  static async changeOrganisationLogo(req, res) {
    try {
      const { file } = req;
      const ext = req.file.mimetype.split('/').pop();
      const key = `${Date.now()}.${ext}`;
      const buket = 'convexity-ngo-logo';
      const logoLink = await AwsUploadService.uploadFile(file, key, buket);
      await OrganisationService.updateOrganisationProfile(req.organisation.id, {
        logo_link: logoLink,
      });
      const updated = await OrganisationService.findOneById(
        req.organisation.id,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation logo updated.',
        updated,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async verifyImage(res) {
    Response.setError(
      HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
      'Request failed. Please try again.',
    );
    return Response.send(res);
  }

  static async completeProfile(req, res) {
    try {
      const { organisation } = req;
      const data = SanitizeObject(req.body, [
        'country',
        'state',
        'address',
        'year_of_inception',
        'website_url',
        'about',
      ]);
      data.profile_completed = true;

      if (!organisation.registration_id) {
        data.registration_id = generateOrganisationId();
      }
      await OrganisationService.updateOrganisationProfile(
        organisation.id,
        data,
      );
      const updated = await OrganisationService.findOneById(organisation.id);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation profile updated.',
        updated,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async getProfile(req, res) {
    try {
      const profile = await OrganisationService.findOneById(
        req.organisation.id,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation profile.',
        profile,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async getAvailableOrgCampaigns(req, res) {
    try {
      const OrganisationId = req.params.organisation_id;
      const queries = SanitizeObject(req.query, ['type']);
      const query = {
        ...queries,
        status: 'active',
      };
      const campaigns = await CampaignService.getCampaigns(
        OrganisationId,
        ...query,
      );
      const campaignsArray = [];
      await Promise.all(campaigns.map(async (theCampaign) => {
        const beneficiariesCount = await theCampaign.countBeneficiaries();
        campaignsArray.push({
          id: theCampaign.id,
          title: theCampaign.title,
          type: theCampaign.type,
          description: theCampaign.description,
          status: theCampaign.status,
          amountDisbursed: theCampaign.amount_disbursed,
          budget: theCampaign.budget,
          funded_with: theCampaign.funded_with,
          location: theCampaign.location,
          start_date: theCampaign.start_date,
          end_date: theCampaign.end_date,
          createdAt: theCampaign.createdAt,
          updatedAt: theCampaign.updatedAt,
          beneficiaries_count: beneficiariesCount,
          Jobs: campaign.Jobs,
          ck8: '', // (await AwsUploadService.getMnemonic(campaign.id)) || null
        });
      }));

      // campaignsArray now contains the processed campaign objects

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaigns.',
        campaignsArray,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async getAllNGOs(req, res) {
    try {
      const ngos = await OrganisationService.getAllNGOs();
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'NGOs retrieved.', ngos);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Request failed. Please try again.${error}`,
      );
      return Response.send(res);
    }
  }

  static async getAllPublicDonorCampaigns(req, res) {
    try {
      const query = SanitizeObject(req.query);
      const campaigns = await CampaignService.getPublicCampaigns({
        ...query,
        is_public: true,
      });
      const campaignPromises = campaigns.map(async (eachCampaign) => {
        const campaignCopy = { ...eachCampaign };
        if (new Date(campaignCopy.end_date) < new Date()) {
          await eachCampaign.update({ status: 'completed' });
        }

        const organisation = await OrganisationService.checkExist(
          campaignCopy.OrganisationId,
        );
        campaignCopy.dataValues.Organisation = organisation;

        const taskPromises = eachCampaign.Jobs.map(async (task) => {
          const assignment = await db.TaskAssignment.findOne({
            where: { TaskId: task.id, status: 'completed' },
          });
          return assignment;
        });
        const completedTask = await Promise.all(taskPromises);
        campaign.dataValues.beneficiaries_count = campaign.Beneficiaries.length;
        campaign.dataValues.task_count = campaign.Jobs.length;
        campaign.dataValues.completed_task = completedTask.filter(
          (assignment) => assignment !== null,
        ).length;
        return campaign;
      });
      const processedCampaigns = await Promise.all(campaignPromises);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', processedCampaigns);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async getAllPrivateDonorCampaigns(req, res) {
    const assignmentTask = [];
    function isExist(id) {
      const find = assignmentTask.find((a) => a && a.TaskId === id);
      if (find) {
        return true;
      }
      return false;
    }
    try {
      let completedTask = 0;
      const organisation = await OrganisationService.checkExistEmail(
        req.user.email,
      );
      Logger.info(`Organisation...: ${JSON.stringify(organisation)}`);
      const query = SanitizeObject(req.query);
      const [campaigns, transaction] = await Promise.all([
        CampaignService.getPrivateCampaigns(query, organisation.id),
        OrganisationService.getOrganisationWallet(organisation.id),
        TransactionService.findOrgnaisationTransactions(organisation.id),
      ]);
      Logger.info(`Transaction...: ${JSON.stringify(transaction)}`);

      if (campaigns.associatedCampaigns) {
        campaigns.associatedCampaigns.forEach(async (the_campaign) => {
          const campaignCopy = { ...the_campaign };
          if (new Date(the_campaign.end_date) < new Date()) {
            await the_campaign.update({ status: 'completed' });
          }
          const assignmentPromises = the_campaign.Jobs.map(async (task) => {
            if (isExist(task.id)) {
              completedTask += 1;
            }
            return db.TaskAssignment.findOne({
              where: { TaskId: task.id, status: 'completed' },
            });
          });
          await Promise.all(assignmentPromises);
          campaignCopy.dataValues.beneficiaries_count = the_campaign.Beneficiaries.length;
          campaignCopy.dataValues.task_count = the_campaign.Jobs.length;
          campaignCopy.dataValues.completed_task = completedTask;
          campaignCopy.dataValues.iDonate = false;
          campaignCopy.dataValues.amount_donated = 0;

          transaction.data.forEach((tran) => {
            Logger.info(`Campaign id...: ${the_campaign.id}`);
            if (
              tran.OrganisationId
              && tran.OrganisationId === organisation.id
              && tran.CampaignId
              && tran.CampaignId === the_campaign.id
            ) {
              campaignCopy.dataValues.iDonate = true;
              campaignCopy.dataValues.amount_donated = tran.amount;
              campaignCopy.dataValues.donation_date = tran.createdAt;
            }
          });
        });
      }

      campaigns?.associatedCampaigns.forEach((data) => {
        const dataCopy = { ...data };
        data.Jobs.forEach((task) => {
          if (isExist(task.id)) {
            dataCopy.dataValues.completed_task += 1;
          }
        });
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', campaigns);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Request failed. Please try again.${error}`,
      );
      return Response.send(res);
    }
  }

  static async getAllOrgCampaigns(req, res) {
    const assignmentTask = [];
    function isExist(id) {
      const find = assignmentTask.find((a) => a && a.TaskId === id);
      if (find) {
        return true;
      }
      return false;
    }

    try {
      const OrganisationId = req.params.organisation_id;
      const query = SanitizeObject(req.query);
      const campaigns = await CampaignService.getCampaigns(
        OrganisationId,
        query,
      );

      if (campaigns?.data) {
        await Promise.all(
          campaigns.data.map(async (data) => {
            const dataCopy = { ...data };
            if (new Date(data.end_date) < new Date()) {
              await data.update({ status: 'ended' });
            }

            await Promise.all(
              data.Jobs.map(async (task) => {
                const assignment = await db.TaskAssignment.findOne({
                  where: { TaskId: task.id, status: 'completed' },
                });
                assignmentTask.push(assignment);
              }),
            );

            dataCopy.dataValues.ck8 = GenerateSecrete();
            dataCopy.dataValues.beneficiaries_count = data.Beneficiaries.length;
            dataCopy.dataValues.task_count = data.Jobs.length;
            dataCopy.dataValues.completed_task = assignmentTask.length;
          }),
        );
      }
      if (campaigns && campaigns.data) {
        campaigns.data.forEach((data) => {
          const dataCopy = { ...data };
          data.Jobs.forEach((task) => {
            if (isExist(task.id)) {
              dataCopy.dataValues.completed_task += 1;
            }
          });
        });
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'All Campaigns.',
        campaigns,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Request failed. Please try again${error}`,
      );
      return Response.send(res);
    }
  }

  static async getAllOrgCash4W(req, res) {
    try {
      let taskCompleted = 0;
      let taskUncompleted = 0;
      let totalTasks = 0;
      const OrganisationId = req.params.organisation_id;
      const cashforworks = await CampaignService.getCash4W(OrganisationId);

      const campaignJobs = cashforworks.map((each_campaign) => each_campaign.Jobs);
      const merge = [...campaignJobs];

      const Jobs = merge.map((jobs) => {
        if (jobs.isCompleted === true) {
          taskCompleted += 1;
        }
        if (jobs.isCompleted === false) {
          taskUncompleted += 1;
        }
        return null;
      });
      totalTasks = Jobs.length;

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'All Cash-For-Work.', {
        task_completed: taskCompleted,
        task_uncompleted: taskUncompleted,
        total_tasks: totalTasks,
        cashforworks,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async totalCashItem(req, res) {
    try {
      await CampaignService.getAllCampaigns();
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
    return null;
  }

  static async getBeneficiariesTransactions(req, res) {
    try {
      const transactions = await BeneficiaryService.findOrganisationVendorTransactions(
        req.organisation.id,
        req.query,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiaries transactions.',
        transactions,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async vendorsTransactions(req, res) {
    try {
      const transactions = await VendorService.organisationVendorsTransactions(
        req.organisation.id,
        req.query,
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Vendors transactions.',
        transactions,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please try again.',
      );
      return Response.send(res);
    }
  }

  static async addMember(req, res) {
    const data = req.body;
    const rules = {
      user_id: 'required|numeric',
      organisation_id: 'required|numeric',
      role: 'required|string|in:admin,member',
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const organisation = await OrganisationService.checkExist(
      data.organisation_id,
    );
    const user = await UserService.getAUser(data.user_id);
    const errors = [];
    if (!organisation) {
      errors.push('Organisation is Invalid');
    }
    if (!user) {
      errors.push('User is Invalid');
    }
    if (errors.length) {
      Response.setError(422, errors);
      return Response.send(res);
    }
    const isMember = await OrganisationService.isMember(
      organisation.id,
      user.id,
    );
    if (!isMember) {
      await organisation
        .createMember({
          UserId: data.user_id,
          role: 'member',
        })
        .then(() => {
          Response.setSuccess(201, 'User Added to NGO successfully.');
          return Response.send(res);
        });
    } else {
      Response.setError(422, 'User is already a member');
      return Response.send(res);
    }
    return null;
  }

  static async updateOrgCampaign(req, res) {
    try {
      const id = req.params.campaign_id;

      const data = SanitizeObject(req.body, [
        'title',
        'description',
        'budget',
        'location',
        'start_date',
        'end_date',
        'status',
      ]);

      // TODO: Check title conflict

      // Handle update here
      await CampaignService.updateSingleCampaign(id, data);
      const campaignService = await CampaignService.getCampaignById(id);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign updated.',
        campaignService,
      );
      return Response.send(res);
    } catch (error) {
      console.log({
        error,
      });
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Campaign update failed. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async updateCampaign(req, res) {
    const data = req.body;
    const rules = {
      campaignId: 'required|numeric',
      budget: 'required|numeric',
      description: 'required|string',
      spending: 'in:vendor,all',
      status: 'in:pending,in-progress,deleted,paused',
      organisation_id: 'required|numeric',
    };

    const validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const campaignExist = await db.Campaign.findOne({
      where: {
        id: data.campaignId,
      },
    });

    if (!campaignExist) {
      Response.setError(400, 'Invalid Campaign Id');
      return Response.send(res);
    }

    const campaignData = {
      budget: data.budget,
      description: data.description,
    };

    if (data.status) {
      campaignData.status = data.status;
    }

    if (data.spending) {
      campaignData.spending = data.spending;
    }

    Response.setSuccess(201, 'Campaign Data updated');
    return Response.send(res);
  }

  static async fetchTransactions(req, res) {
    try {
      const { organisationId } = req.params;

      const organisationExist = await db.Organisations.findOne({
        where: {
          id: organisationId,
        },
        include: {
          as: 'Transaction',
          model: db.Transaction,
        },
      });

      const mintTransactions = await db.FundAccount.findAll({
        where: {
          OrganisationId: organisationId,
        },
      });

      Response.setSuccess(201, 'Transactions', {
        transaction: organisationExist.Transaction,
        mintTransaction: mintTransactions,
      });

      return Response.send(res);
    } catch (error) {
      console.log(error.message);
      Response.setSuccess(201, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  // static async createWallet(req, res) {
  //   try {
  //     QueueService.createWallet(OrganisationId, 'organisation', campaign.id);
  //   } catch (error) {}
  // }

  // static createItemCampaign(req, res) {
  //   try {
  //   } catch (error) {}
  // }

  static async createCampaign(req, res) {
    try {
      const rules = {
        'location.country': 'required|string',
        'location.state': 'required|array',
        formId: 'numeric',
        category_id: 'numeric',
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const data = SanitizeObject(req.body);
      const spending = data.type === 'campaign' ? 'vendor' : 'all';
      const OrganisationId = req.organisation.id;

      const OrgWallet = await OrganisationService.getOrganisationWallet(
        OrganisationId,
      );
      const { is_verified_all: isVerifiedAll } = req.user;
      const { is_verified: isVerified } = req.user;
      if (!isVerifiedAll) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Your account has not been activated yet',
        );
        return Response.send(res);
      }
      if (!isVerified) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Your profile is not verified yet, please update your profile',
        );
        return Response.send(res);
      }
      if (data.formId) {
        const form = await CampaignService.findCampaignFormById(data.formId);

        let total = 0;
        form.questions.map((val) => {
          const reward = val.question.options.reduce(
            (accumulator, currentValue) => {
              if (Number.isNaN(accumulator + currentValue.reward)) {
                return 0;
              } return accumulator + currentValue.reward;
            },
            0,
          );
          total += reward;
          return null;
        });
        if (total > data.budget) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Beneficiary reward greater than budget',
          );
          return Response.send(res);
        }
      }

      if (data.budget > OrgWallet.balance || OrgWallet.balance === 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Org wallet balance. Try reducing Budget',
        );
        return Response.send(res);
      }
      data.is_processing = false;
      CampaignService.addCampaign({
        ...data,
        spending,
        OrganisationId,
        status: 'pending',
      })
        .then(async (eachCampaign) => {
          await QueueService.createWallet(
            OrganisationId,
            'organisation',
            eachCampaign.id,
          );
          if (eachCampaign.type === 'item') {
            await QueueService.createCollection(eachCampaign);
          } else {
            await QueueService.createEscrow(eachCampaign);
          // AwsUploadService.createSecret(campaign.id);
          }
          Response.setSuccess(
            HttpStatusCode.STATUS_CREATED,
            'Created Campaign.',
            campaign,
          );
          return Response.send(res);
        })
        .catch((err) => {
          Logger.error(err);
          throw err;
        });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Campaign creation failed. Please retry.${error}`,
      );
      return Response.send(res);
    }
    return null;
  }

  static async addCampaignProduct(req, res) {
    try {
      const { body, eachCampaign } = req;

      const product = await ProductService.findCampaignProducts(eachCampaign.id);
      const isExist = product.filter((a) => body.find((b) => a.tag === b.tag));
      if (isExist.length > 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Product With Tag: ${isExist[0].tag} Already Exist`,
        );
        return Response.send(res);
      }

      const products = await Promise.all(
        body.map(async (_body) => {
          const data = SanitizeObject(
            _body,
            ['type', 'tag', 'cost'] || ['type', 'tag'],
          );
          data.product_ref = generateProductRef();
          data.cost = data.type === 'item' ? 1 : data.cost;
          const createdProduct = await db.Product.create({
            ...data,
            CampaignId: eachCampaign.id,
          });
          // console.log(createdProduct)
          if (createdProduct) {
            _body.vendors.forEach(async (VendorId) => {
              await db.VendorProduct.create({
                vendorId: VendorId,
                productId: createdProduct.id,
              });
              await CampaignService.approveVendorForCampaign(
                eachCampaign.id,
                VendorId,
              );
            });
          }

          return createdProduct;
          // return ProductService.addProduct(data, _body.vendors, campaign.id);
        }),
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Product added to stores',
        products,
      );
      Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Contact support.',
      );
      return Response.send(res);
    }
    return null;
  }

  static async DeleteCampaignProduct(req, res) {
    const { ProductId } = req.body;
    try {
      const iSProduct = await db.Product.findByPk(ProductId);
      if (!iSProduct) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Product with this ID  ${ProductId} Not Approved`,
        );
        return Response.send(res);
      }
      const isVendorDeleted = await db.VendorProduct.destroy({
        where: {
          productId: ProductId,
        },
      });
      if (isVendorDeleted) {
        await db.Product.destroy({
          where: {
            id: ProductId,
          },
        });
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Product Deleted in stores',
      );
      Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
    return null;
  }

  static async withdrawalRequest(req, res) {
    try {
      const requests = await db.RequestFund.findAll();
      await Promise.all(requests.map(async (request) => {
        const eachCampaign = await CampaignService.getCampaignById(
          request.campaign_id,
        );
        request.dataValues.campaign = eachCampaign;
      }));

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Donor withdrawal requests',
        requests,
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(JSON.stringify(error));
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async requestFund(req, res) {
    try {
      const eachCampaign = await CampaignService.getCampaignById(
        req.body.campaign_id,
      );
      if (eachCampaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Already Funded',
        );
        return Response.send(res);
      }
      if (eachCampaign.budget === 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Fund',
        );
        return Response.send(res);
      }
      const bodyAllowedList = new Set([
        'reason',
        'donor_organisation_id',
        'campaign_id',
      ]);

      await Promise.all(req.body.map(async (prop) => {
        if (!(prop in req.body) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body',
          );
          return Response.send(res);
        }
        return null;
      }));

      const request = await db.RequestFund.create(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Request sent',
        request,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.: ${error}`,
      );
      return Response.send(res);
    }
  }

  static async approveOrReject(req, res) {
    try {
      const rules = {
        campaign_id: 'required|numeric',
        type: 'required|string|in:reject,approve',
        request_id: 'required|numeric',
      };

      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(400, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const eachCampaign = await CampaignService.getCampaignById(
        req.body.campaign_id,
      );
      if (eachCampaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Already Funded',
        );
        return Response.send(res);
      }
      if (eachCampaign.budget === 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Fund',
        );
        return Response.send(res);
      }
      const bodyAllowedList = new Set(['request_id', 'campaign_id', 'type']);
      await Promise.all(req.body.map(async (prop) => {
        if (!(prop in req.body) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body',
          );
          return Response.send(res);
        }
        return null;
      }));

      const request = await db.RequestFund.findOne({
        where: {
          id: req.body.request_id,
          campaign_id: req.body.campaign_id,
        },
      });
      if (!request) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Request not found',
        );
        return Response.send(res);
      }
      await request.update({
        status: req.body.type === 'reject' ? 'Rejected' : 'Approved',
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        `Request ${req.body.type === 'reject' ? 'Rejected' : 'Approved'}`,
        request,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.: ${error}`,
      );
      return Response.send(res);
    }
  }

  static async extendCampaign(req, res) {
    const {
      end_date, campaign_id: campaignId, additional_budget: additionalBudget,
    } = req.body;
    const today = moment();
    const endDate = moment(end_date);
    try {
      const rules = {
        end_date: 'required|date',
        campaign_id: 'required|numeric',
        additional_budget: 'numeric',
      };

      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(400, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }

      if (today > endDate) {
        Response.setError(400, 'The end date must be after today');
        return Response.send(res);
      }

      const bodyAllowedList = new Set([
        'end_date',
        'description',
        'location',
        'campaign_id',
        'additional_budget',
      ]);
      await Promise.all(req.body.map(async (prop) => {
        if (!(prop in req.body) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body',
          );
          return Response.send(res);
        }
        return null;
      }));

      // if (req.campaign.is_funded) {
      //   Response.setError(
      //     HttpStatusCode.STATUS_BAD_REQUEST,
      //     `Campaign Already Funded`
      //   );
      //   return Response.send(res);
      // }
      const dateB = moment(req.campaign.updatedAt);
      const dateC = moment(end_date);

      const extensionPeriod = dateC.diff(dateB, 'days');

      const campaign_service = await CampaignService.getCampaignWallet(
        campaignId,
        req.organisationId,
      );
      const campaignWallet = campaign_service.Wallet;
      const organisation = await OrganisationService.getOrganisationWallet(
        req.organisationId,
      );

      const OrgWallet = organisation.Wallet;

      req.campaign.budget = additionalBudget
        ? Number(additionalBudget) + req.campaign.budget
        : req.campaign.budget;
      req.body.status = req.campaign.type === 'cash-for-work' ? 'active' : 'ongoing';
      const newCampaign = await req.campaign.update(req.body);
      const history = await db.CampaignHistory.create({
        extension_period: extensionPeriod,
        new_end_date: end_date,
        additional_budget: additionalBudget,
        campaign_id: campaignId,
      });
      newCampaign.dataValues.history = history;
      await QueueService.CampaignExtensionFund(
        campaign,
        campaignWallet,
        OrgWallet,
        Number(additionalBudget),
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'campaign extended',
        newCampaign,
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

  static async campaignHistory(req, res) {
    try {
      const eachCampaign = await CampaignService.campaignHistory(req.campaign.id);
      await Promise.all(eachCampaign.history.map(async (history) => {
        const historyCopy = { ...history };
        const date = moment(eachCampaign.end_date).isSame(
          history.new_end_date,
          'day',
        );
        if (date) {
          historyCopy.dataValues.currentCampaign = true;
        } else {
          historyCopy.dataValues.currentCampaign = false;
        }
      }));

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'campaign history retrieved',
        eachCampaign,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.: ${error}`,
      );
      return Response.send(res);
    }
  }

  static async UpdateCampaignProduct(req, res) {
    const { ProductId } = req.body;
    try {
      const iSProduct = await db.Product.findByPk(ProductId);
      if (!iSProduct) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Product with this ID  ${ProductId} Not Approved`,
        );
        return Response.send(res);
      }
      await db.Product.update(
        {
          ...req.body,
        },
        {
          where: {
            id: ProductId,
          },
        },
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Product Updated in stores',
      );
      Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Contact support.',
      );
      return Response.send(res);
    }
    return null;
  }

  static async ProductVendors(req, res) {
    try {
      const productvendors = await db.VendorProduct.findAll();
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product\'s Vendors.',
        productvendors,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.${error}`,
      );
      return Response.send(res);
    }
  }

  static async getCampaignProducts(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const products = await ProductService.findCampaignProducts(campaignId);
      const eachCampaign = await db.Campaign.findOne({ where: { id: campaignId } });

      products.forEach((product) => {
        const productCopy = { ...product };
        productCopy.dataValues.campaign_status = eachCampaign.status;
        productCopy.ProductVendors.forEach((vendor) => {
          const vendorCopy = { ...vendor };
          vendorCopy.dataValues.VendorName = `${vendorCopy.first_name} ${vendorCopy.last_name}`;
        });
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Products.',
        products,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getProductVendors(req, res) {
    try {
      const VendorId = req.params.vendor_id;
      const vendor = await ProductService.ProductVendors(VendorId);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Beneficiaries',
        vendor,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesBalance(req, res) {
    try {
      const zeroTo9099 = 0;
      const tenTo14999 = 0;
      const twentyTo24999 = 0;
      const twenty5To29999 = 0;
      const fourtyTo44999 = 0;
      const fourty5up = 0;
      const CampaignId = req.params.campaign_id;
      const wallet = await BeneficiaryService.getApprovedBeneficiaries(
        CampaignId,
      );
      const balanceRanges = [
        { min: 0, max: 9099, count: 0 },
        { min: 10000, max: 14999, count: 0 },
        { min: 15000, max: 19999, count: 0 },
        { min: 20000, max: 24999, count: 0 },
        { min: 25000, max: 29999, count: 0 },
        { min: 30000, max: 34999, count: 0 },
        { min: 35000, max: 39999, count: 0 },
        { min: 40000, max: 44999, count: 0 },
        { min: 45000, max: Infinity, count: 0 },
      ];

      balanceRanges.map((range) => {
        let count = 0;

        wallet.forEach((user) => {
          const balance = parseInt(user.User.Wallets[0].balance, 10);

          if (balance >= range.min && balance <= range.max) {
            count += 1;
          }
        });

        return count;
      });

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        zeroTo9099,
        tenTo14999,
        twentyTo24999,
        twenty5To29999,
        fourtyTo44999,
        fourty5up,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiaries(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId,
        req.query,
      );

      beneficiaries.data.forEach((beneficiary) => {
        const beneficiaryCopy = { ...beneficiary };
        beneficiary.User.Answers.forEach((answer) => {
          if (answer.campaignId === CampaignId) {
            beneficiaryCopy.dataValues.User.dataValues.Answers = [answer];
          }
        });
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Beneficiaries',
        beneficiaries,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server Error. Unexpected error. Please retry.${error}`,
      );
      return Response.send(res);
    }
  }

  static async getVendorTransactionPerBene(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      // const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(CampaignId);
      const transactions = await BeneficiaryService.findVendorTransactionsPerBene(CampaignId);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Beneficiaries',
        transactions,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesLocation(req, res) {
    try {
      let Lagos = 0;
      let Abuja = 0;
      let Kaduna = 0;
      let Jos = 0;
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId,
        req.query,
      );

      await Promise.all(beneficiaries.map(async (beneficiary) => {
        if (beneficiary.User.location.includes('state')) {
          const parsedJson = JSON.parse(beneficiary.User.location);
          if (parsedJson.state === 'Abuja') Abuja += 1;
          if (parsedJson.state === 'Lagos') Lagos += 1;
          if (parsedJson.state === 'Kaduna') Kaduna += 1;
          if (parsedJson.state === 'Jos') Jos += 1;
        }
      }));

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        Abuja,
        Lagos,
        Kaduna,
        Jos,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesMStatus(req, res) {
    try {
      let married = 0;
      let single = 0;
      let divorce = 0;
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId,
        req.query,
      );
      if (beneficiaries.data.length > 0) {
        for (let i = 0; i < beneficiaries.data.length; i += 1) {
          if (beneficiaries[i].User.marital_status === 'single') {
            single += 1;
          } else if (beneficiaries[i].User.marital_status === 'married') {
            married += 1;
          } else if (beneficiaries[i].User.marital_status === 'divorce') {
            divorce += 1;
          }
        }
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        single,
        married,
        divorce,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesAge(req, res) {
    try {
      let eighteenTo29 = 0;
      let thirtyTo41 = 0;
      let forty2To53 = 0;
      let fifty4To65 = 0;
      let sixty6Up = 0;
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId,
        req.query,
      );

      for (let i = 0; i < beneficiaries.data.length; i += 1) {
        if (
          parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) >= 18
          && parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) <= 29
        ) {
          eighteenTo29 += 1;
        }
        if (
          parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) >= 30
          && parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) <= 41
        ) {
          thirtyTo41 += 1;
        }
        if (
          parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) >= 42
          && parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) <= 53
        ) {
          forty2To53 += 1;
        }
        if (
          parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) >= 54
          && parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) <= 65
        ) {
          fifty4To65 += 1;
        }
        if (
          parseInt(moment().format('YYYY')
              - moment(beneficiaries[i].User.dob).format('YYYY'), 10) >= 66
        ) {
          sixty6Up += 1;
        }
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        eighteenTo29,
        thirtyTo41,
        forty2To53,
        fifty4To65,
        sixty6Up,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async updaeCampaignBeneficiary(req, res) {
    try {
      const { eachCampaign } = req;

      const data = SanitizeObject(req.body, ['approved', 'rejected']);

      if (data.approved && !data.rejected) {
        data.rejected = false;
      }

      if (
        data.rejected
        && (typeof data.approved === 'undefined' || !!data.approved)
      ) {
        data.approved = false;
      }

      if (eachCampaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campagin Fund Already Disbursed.',
        );
        return Response.send(res);
      }
      const approval = await BeneficiaryService.updateCampaignBeneficiary(
        eachCampaign.id,
        req.beneficiary_id,
        data,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary Approval Updated!',
        approval,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getOrganisationBeneficiaries(req, res) {
    try {
      const { organisation } = req;
      const beneficiaries = await BeneficiaryService.findOrgnaisationBeneficiaries(
        organisation.id,
        req.query,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation beneficiaries',
        beneficiaries,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
      );
      return Response.send(res);
    }
  }

  static async getOrganisationBeneficiaryDetails(req, res) {
    try {
      const id = req.params.beneficiary_id;
      const [beneficiary, transaction] = await Promise.all([
        BeneficiaryService.organisationBeneficiaryDetails(id, req.organisation.id),
        TransactionService.findTransactions({
          BeneficiaryId: id,
          is_approved: true,
        }),
      ]);

      console.log(beneficiary, 'opop');

      // Calculate total wallet spent
      const totalWalletSpent = transaction
        .filter(
          (tran) => (tran.narration === 'Vendor Order'
          || tran.transaction_type === 'withdrawal'),
        ).reduce((total, tran) => total + tran.amount, 0);

      // Calculate total wallet received
      const totalWalletReceived = transaction
        .filter(
          (tran) => tran.BeneficiaryId === id && tran.OrganisationId === req.organisation.id,
        )
        .reduce((total, tran) => total + tran.amount, 0);

      // Calculate total wallet balance
      const totalWalletBalance = await Promise.all(
        beneficiary.Campaigns.flatMap(
          (eachCampaign) => eachCampaign.BeneficiariesWallets.map(async (wallet) => {
            if (wallet.CampaignId && wallet.address) {
              const campaignWallet = await WalletService.findUserCampaignWallet(
                wallet.UserId,
                wallet.CampaignId,
              );
              const token = await BlockchainService.allowance(
                campaignWallet.address,
                wallet.address,
              );
              const balance = Number(token.Allowed.split(',').join(''));
              return balance;
            }
            return 0;
          }),
        ),
      ).reduce((total, balance) => total + balance, 0);
      beneficiary.dataValues.total_wallet_spent = totalWalletSpent;
      beneficiary.dataValues.total_wallet_balance = totalWalletBalance;
      beneficiary.dataValues.total_wallet_received = totalWalletReceived;
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary Details.',
        beneficiary,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server Error: Unexpected error occurred.${error}`,
      );
      return Response.send(res);
    }
  }

  static async approvedAllbeneficiaries(req, res) {
    try {
      const { eachCampaign } = req;
      const { ids } = req.body;

      if (eachCampaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Fund Already Disbursed.',
        );
        return Response.send(res);
      }
      const [approvals] = await BeneficiaryService.approveAllCampaignBeneficiaries(
        eachCampaign.id,
        ids,
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiaries approved!', {
        approvals,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server Error. Please retry.${error}`,
      );
      return Response.send(res);
    }
  }

  static async rejectAllbeneficiaries(req, res) {
    try {
      const { eachCampaign } = req;
      const { ids } = req.body;

      if (eachCampaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Fund Already Disbursed.',
        );
        return Response.send(res);
      }
      const [approvals] = await BeneficiaryService.rejectAllCampaignBeneficiaries(
        eachCampaign.id,
        ids,
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiaries rejected!', {
        approvals,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async approveCampaignVendor(req, res) {
    try {
      const approved = await CampaignService.approveVendorForCampaign(
        req.campaign.id,
        req.body.vendor_id,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor approved.',
        approved,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async removeCampaignVendor(req, res) {
    try {
      const removed = await CampaignService.removeVendorForCampaign(
        req.campaign.id,
        req.body.vendor_id,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor removed.',
        removed,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getCampaignVendors(req, res) {
    try {
      Logger.info('Fetching campaign vendors...');
      const vendors = await CampaignService.campaignVendors(
        req.params.campaign_id,
        req.query,
      );
      const setObj = new Set();
      vendors.data.reduce((acc, item) => {
        if (!setObj.has(item.VendorId)) {
          setObj.add(item.VendorId, item);
          acc.push(item);
        }
        return acc;
      }, []);
      Logger.info('Fetched campaign vendors');
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Vendors.',
        vendors,
      );
      return Response.send(res);
    } catch (error) {
      Logger.error('Error fetching campaign vendors');
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error occurred.',
      );
      return Response.send(res);
    }
  }

  static async updateProfile(req, res) {
    function extractDomain(url) {
      let domain;
      // find & remove protocol (http, ftp, etc.) and get domain
      if (url.indexOf('://') > -1) {
        [, domain] = url.split('/');
      } else {
        [domain] = url.split('/');
      }

      if (domain.indexOf('www.') > -1) {
        [, domain] = domain.split('www.');
      }

      [domain] = domain.split(':'); // find & remove port number
      [domain] = domain.split('?'); // find & remove URL params

      return domain;
    }
    let org;
    try {
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        const rules = {
          organisation_id: 'required|numeric',
          first_name: 'required|alpha',
          last_name: 'required|alpha',
          email: 'required|email',
          phone: 'required|string',
          address: 'required|string',
          state: 'required|string',
          country: 'required|string',
          registration_id: 'required|string',
          year: 'required',
          website_url: 'url',
        };
        const validation = new Validator(fields, rules, {
          url: 'Only valid url with https or http allowed',
        });
        if (validation.fails()) {
          Response.setError(400, validation.errors);
          return Response.send(res);
        }
        const urlString = fields.website_url;
        const domain = extractDomain(urlString);
        const { email } = fields;
        const re = `(\\W|^)[\\w.\\-]{0,25}@${domain}(\\W|$)`;
        if (!email.match(new RegExp(re))) {
          Response.setError(400, `Email must end in @${domain}`);
          return Response.send(res);
        }

        if (files.logo) {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
          if (!allowedTypes.includes(files.logo.type)) {
            Response.setError(
              400,
              'Invalid File type. Only jpg, png and jpeg files allowed for Profile picture',
            );
            return Response.send(res);
          }
        }
        const organisationExist = await db.Organisations.findOne({
          where: {
            email: fields.email,
          },
        });
        if (!organisationExist || organisationExist.id === fields.organisation_id) {
          if (!organisationExist) {
            org = await db.Organisations.findByPk(fields.organisation_id);
          } else {
            org = organisationExist;
          }
          org
            .update({
              email: fields.email,
              phone: fields.phone,
              address: fields.address,
              state: fields.state,
              country: fields.country,
              registration_id: fields.registration_id,
              year_of_inception: fields.year,
              website_url: fields.website_url,
            })
            .then(async () => {
              if (files.logo) {
                await uploadFile(
                  files.logo,
                  `ngo-l-${org.id}`,
                  'convexity-ngo-logo',
                ).then((url) => {
                  org.update({
                    logo_link: url,
                  });
                });
              }
              await db.User.findByPk(req.user.id).then((user) => {
                user
                  .update({
                    first_name: fields.first_name,
                    last_name: fields.last_name,
                  })
                  .then(() => {
                    Response.setSuccess(
                      201,
                      'NGO profile updated successfully',
                      {
                        org,
                      },
                    );
                    return Response.send(res);
                  });
              });
            });
        } else {
          Response.setError(
            400,
            'Email has been taken by another organisation',
          );
          return Response.send(res);
        }
        return null;
      });
    } catch (error) {
      Response.setError(500, 'An error Occured');
      return Response.send(res);
    }
    return null;
  }

  static async mintToken2(req, res) {
    const data = req.body;

    fs.writeFile('sample.txt', JSON.stringify(data), (err) => {
      if (err) {
        return res.json({
          status: 'Error',
        });
      }
      return res.json({
        status: 'DOne',
      });
    });
  }

  static async getFinancials(req, res) {
    try {
      const { id } = req.params;
      const ngo = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
        },
      });
      const recieved = await db.Transaction.sum('amount', {
        where: {
          walletRecieverId: ngo.Wallet.uuid,
        },
      });
      const sent = await db.Transaction.sum('amount', {
        where: {
          walletSenderId: ngo.Wallet.uuid,
        },
      });
      Response.setSuccess(200, 'Organisation Financials Retrieved', {
        balance: ngo.Wallet.balance,
        recieved,
        disbursed: sent,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(200, 'Id is invalid');
      return Response.send(res);
    }
  }

  // static async getMetric(req) {
  //   const { id } = req.params;
  // }

  static async bantuTransfer(req, res) {
    const data = req.body;
    const rules = {
      organisation_id: 'required|numeric',
      xbnAmount: 'required|numeric',
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    }
    const organisation = await db.Organisations.findOne({
      where: {
        id: data.organisation_id,
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
        where: {
          bantuAddress: {
            [Op.ne]: null,
          },
        },
      },
    });

    if (organisation) {
      await BantuService.transferToken(
        organisation.Wallet[0].bantuPrivateKey,
        data.xbnAmount,
      )
        .then(async (response) => {
          await organisation
            .createMintTransaction({
              amount: data.xbnAmount,
              transactionReference: response.hash,
              channel: 'bantu',
            })
            .then((fundTransaction) => {
              const messageBody = {
                id: organisation.id,
                fund: fundTransaction.id,
                address: organisation.Wallet[0].address,
                walletId: organisation.Wallet[0].uuid,
                amount: data.xbnAmount,
              };
              mintTokenQueue.send(
                new Message(messageBody, {
                  contentType: 'application/json',
                }),
              );
              Response.setSuccess(200, 'Token Minting Initiated');
              return Response.send(res);
            });
        })
        .catch((error) => {
          Response.setError(400, error);
          return Response.send(res);
        });
    } else {
      Response.setError(400, 'Invalid Organisation / Campaign');
      return Response.send(res);
    }
    return null;
  }

  static async mintToken(req, res) {
    const data = req.body;
    const txRef = data.id;

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    const response = await api.get(
      `https://api.flutterwave.com/v3/transactions/${txRef}/verify`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const organisationId = response.data.data.meta.orgId;
    const { amount } = response.data.data;

    const organisation = await db.Organisations.findOne({
      where: {
        id: organisationId,
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
        where: {
          bantuAddress: {
            [Op.ne]: null,
          },
        },
      },
    });

    const reference = await db.FundAccount.findOne({
      where: {
        transactionReference: txRef,
      },
    });
    if (reference) {
      Response.setError(400, 'Transaction Reference already exist');
      return Response.send(res);
    }

    if (organisation) {
      await organisation
        .createMintTransaction({
          amount,
          transactionReference: txRef,
          channel: 'bantu',
        })
        .then((fundTransaction) => {
          const messageBody = {
            id: organisation.id,
            fund: fundTransaction.id,
            address: organisation.Wallet[0].address,
            walletId: organisation.Wallet[0].uuid,
            amount,
          };
          mintTokenQueue.send(
            new Message(messageBody, {
              contentType: 'application/json',
            }),
          );
          Response.setSuccess(200, 'Mint Action Initiated');
          return Response.send(res);
        });
    } else {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }
    return null;
  }

  static async getWallets(req, res) {
    try {
      const id = req.params.organisationId;
      const organisation = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          attributes: {
            exclude: ['bantuPrivateKey', 'privateKey'],
          },
        },
      });
      Response.setSuccess(200, 'Organisation Wallet Retrieved', {
        wallets: organisation.Wallet,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  static async getMainWallet(req, res) {
    try {
      const id = req.params.organisationId;
      console.log(id, 'id');
      const organisation = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          attributes: {
            exclude: ['bantuPrivateKey', 'privateKey'],
          },
          where: {
            bantuAddress: {
              [Op.ne]: null,
            },
          },
        },
      });
      Response.setSuccess(200, 'Organisation Wallet Retrieved', {
        wallet: organisation.Wallet[0],
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  static async getCampignWallet(req, res) {
    try {
      const id = req.params.organisationId;
      const eachCampaign = req.params.campaignId;
      const organisation = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          attributes: {
            exclude: ['bantuPrivateKey', 'privateKey'],
          },
          where: {
            CampaignId: eachCampaign,
          },
        },
      });
      Response.setSuccess(200, 'Organisation Wallet Retrieved', {
        wallet: organisation.Wallet[0],
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, 'Invalid Organisation /Campaign Id');
      return Response.send(res);
    }
  }

  static async transferToken(req, res) {
    const data = req.body;
    const rules = {
      campaign: 'required|numeric',
      organisation_id: 'required|numeric',
      amount: 'required|numeric|min:100',
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const organisation = await db.Organisations.findOne({
      where: {
        id: data.organisation_id,
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
      },
    });

    if (!organisation) {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }

    const wallets = organisation.Wallet;
    let mainWallet;
    let reciepientWallet;
    let campaignExist = false;
    wallets.forEach((element) => {
      if (element.CampaignId === data.campaign) {
        campaignExist = true;
        reciepientWallet = element;
      }
      if (element.bantuAddress) {
        mainWallet = element;
      }
    });

    if (!campaignExist) {
      Response.setError(
        400,
        'Organisation does not have a wallet attached to this campaign',
      );
      return Response.send(res);
    }

    const eachCampaign = await db.Campaign.findByPk(data.campaign);

    if (mainWallet.balance < data.amount) {
      Response.setError(400, 'Main Wallet Balance has Insufficient Balance');
      return Response.send(res);
    }
    await organisation
      .createTransaction({
        walletSenderId: mainWallet.uuid,
        walletRecieverId: reciepientWallet.uuid,
        amount: data.amount,
        narration: `Funding ${eachCampaign.title} campaign `,
      })
      .then((transaction) => {
        transferToQueue.send(
          new Message(
            {
              senderAddress: mainWallet.address,
              senderPass: mainWallet.privateKey,
              reciepientAddress: reciepientWallet.address,
              amount: data.amount,
              transaction: transaction.uuid,
            },
            {
              contentType: 'application/json',
            },
          ),
        );
      });
    Response.setSuccess(200, 'Transfer has been Initiated');
    return Response.send(res);
  }

  static async getBeneficiariesFinancials(req, res) {
    // try {
    const { id } = req.params;
    const ngo = await db.Organisations.findOne({
      where: {
        id,
      },
      include: {
        model: db.OrganisationMembers,
        as: 'Member',
      },
    });
    if (ngo) {
      const members = ngo.Member.map((element) => element.id);
      const campaigns = await db.Campaign.findAll({
        where: {
          OrganisationMemberId: {
            [Op.or]: members,
          },
        },
        include: {
          model: db.Beneficiaries,
          as: 'Beneficiaries',
          include: {
            model: db.User,
            as: 'User',
            include: {
              model: db.Wallet,
              as: 'Wallet',
            },
          },
        },
      });
      const wallets = [];
      let remaining = 0;
      campaigns.forEach((camp) => {
        camp.Beneficiaries.forEach((beneficiary) => {
          const wallet = beneficiary.User.Wallet;
          if (!wallets.includes(wallet.uuid)) {
            wallets.push(wallet.uuid);
          }
          remaining += wallet.balance;
        });
      });
      const spent = await db.Transaction.sum('amount', {
        where: {
          walletSenderId: {
            [Op.or]: wallets,
          },
        },
      });
      const recieved = await db.Transaction.sum('amount', {
        where: {
          walletRecieverId: {
            [Op.or]: wallets,
          },
        },
      });
      Response.setSuccess(200, 'Beneficiaries', {
        spent,
        recieved,
        remaining,
      });
      return Response.send(res);
    }
    return null;
  }

  static async createVendor(req, res) {
    try {
      const { user, organisation } = req;
      console.log('user', user);
      console.log('organisation', organisation);
      const data = SanitizeObject(req.body, [
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'store_name',
        'location',
      ]);
      const vendor = await OrganisationService.createVendorAccount(
        organisation,
        data,
        user,
      );
      await QueueService.createWallet(vendor.id, 'user');

      Response.setSuccess(201, 'Vendor Account Created.', vendor);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.${error}`);
      return Response.send(res);
    }
  }

  static async getOrganisationVendors(req, res) {
    try {
      const { organisation } = req;
      const vendors = (
        await VendorService.organisationVendors(organisation)
      ).map((response) => {
        const toObject = response.toObject();
        toObject.Wallet.map((wallet) => {
          const walletCopy = { ...wallet };
          delete walletCopy.privateKey;
          delete walletCopy.bantuPrivateKey;
          return wallet;
        });
        return toObject;
      });
      Response.setSuccess(200, 'Organisation vendors', vendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, 'Internal server error. Contact support.');
      return Response.send(res);
    }
  }

  static async getDonorVendors(req, res) {
    try {
      const { organisation } = req;
      const vendors = (
        await VendorService.organisationVendors(organisation, req.query)
      ).map((response) => {
        const toObject = response.toObject();
        toObject.Wallet.map((wallet) => {
          const walletCopy = { ...wallet };
          delete walletCopy.privateKey;
          delete walletCopy.bantuPrivateKey;
          return wallet;
        });
        return toObject;
      });
      Response.setSuccess(200, 'Organisation vendors', vendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, 'Internal server error. Contact support.');
      return Response.send(res);
    }
  }

  static async getVendorDetails(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const vendorId = req.params.vendor_id || req.body.vendor_id;
      const vendorProducts = await VendorService.vendorStoreProducts(vendorId);
      const vendor = await VendorService.vendorPublicDetails(vendorId, {
        OrganisationId,
      });
      vendor.dataValues.Store = {
        Products: vendorProducts,
      };
      vendor.dataValues.total_received = vendor.Wallets
        .map((wallet) => wallet.ReceivedTransactions
          .map((tx) => tx.amount)
          .reduce((a, b) => a + b, 0))
        .reduce((a, b) => a + b, 0);

      vendor.dataValues.total_spent = vendor.Wallets
        .map((wallet) => wallet.SentTransactions
          .map((tx) => tx.amount)
          .reduce((a, b) => a + b, 0))
        .reduce((a, b) => a + b, 0);

      Response.setSuccess(200, 'Organisation vendor', vendor);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, 'Internal server error. Contact support.');
      return Response.send(res);
    }
  }

  static async getVendorsSummary(req, res) {
    try {
      const { organisation } = req;
      const vendorsCount = (
        await VendorService.organisationVendors(organisation, req.query)
      ).length;
      const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
      const previousStat = await VendorService.organisationDailyVendorStat(
        organisation.id,
        yesterday,
      );
      const todayStat = await VendorService.organisationDailyVendorStat(
        organisation.id,
      );
      const Transactions = await VendorService.organisationVendorsTransactions(
        organisation.id,
        req.query,
      );
      Response.setSuccess(200, 'Organisation vendors Summary', {
        organisation,
        vendors_count: vendorsCount,
        previous_stat: previousStat,
        today_stat: todayStat,
        Transactions: Transactions.data,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async matrix(req, res) {
    try {
      const matrics = {};
      const disbursedDates = [];
      const spendDate = [];
      const isOrgMember = await OrganisationService.isMemberUser(req.user.id);

      const isOrganisationCamp = await CampaignService.getAllCampaigns({
        OrganisationId: isOrgMember.OrganisationId,
        is_funded: true,
        ...req.query,
      });
      const isOrganisationCampWallet = await WalletService.findOrganisationCampaignWallets(
        isOrgMember.OrganisationId,
      );
      isOrganisationCamp.data.forEach((matric) => {
        disbursedDates.push(matric.updatedAt);
      });
      isOrganisationCampWallet.forEach((spend) => {
        spendDate.push(spend.updatedAt);
      });
      matrics.maxDisbursedDate = new Date(Math.max(...disbursedDates));
      matrics.minDisbursedDate = new Date(Math.min(...disbursedDates));
      matrics.maxSpendDate = new Date(Math.max(...spendDate));
      matrics.minSpendDate = new Date(Math.min(...spendDate));
      Response.setSuccess(200, 'matrics received', matrics);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.${error}`);
      return Response.send(res);
    }
  }

  // static async cash_item() {
  //   try {
  //   } catch (error) {}
  // }

  static async record(req, res) {
    let isOrgMember;
    let isOrganisationCamp;
    const isOrganisationCampWallet = await WalletService.findOrganisationCampaignWallets(
      isOrgMember.OrganisationId,
    );

    function getDifference() {
      return isOrganisationCampWallet.filter(
        (wallet) => isOrganisationCamp.data.some(
          (eachCampaign) => wallet.CampaignId === eachCampaign.id,
        ),
      );
    }
    try {
      isOrgMember = await OrganisationService.isMemberUser(req.user.id);
      isOrganisationCamp = await CampaignService.getAllCampaigns({
        OrganisationId: isOrgMember.OrganisationId,
        is_funded: true,
        ...req.query,
      });
      let campaignBudget = 0;
      if (isOrganisationCamp.data.length > 0) {
        campaignBudget = isOrganisationCamp.data
          .map((val) => val.budget)
          .reduce((accumulator, curValue) => accumulator + curValue);
      }

      const amountDisbursed = isOrganisationCamp.data
        .map((val) => val.amount_disbursed)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      const balance = getDifference()
        .map((val) => val.balance)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      const totalItemsDistributed = isOrganisationCamp.data
        .map((val) => val.minting_limit)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      Response.setSuccess(200, 'transaction', {
        campaign_budget: campaignBudget,
        amount_disbursed: amountDisbursed,
        total_items_distributed: totalItemsDistributed,
        balance,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(500, 'Internal server error. Contact support.');
      return Response.send(res);
    }
  }

  static async non_ngo_beneficiaries(req, res) {
    try {
      const query = SanitizeObject(req.query);

      const org = await OrganisationService.isMemberUser(req.user.id);
      const nonOrgBeneficiaries = await BeneficiaryService.nonOrgBeneficiaries({
        ...query,
        OrganisationId: org.OrganisationId,
      });
      Response.setSuccess(
        200,
        'this beneficiary not under your organisation',
        nonOrgBeneficiaries,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async fundWithProvidus(req, res) {
    const { organisation_id: organisationId } = req.params;
    try {
      const fundWithProvidus = await ProvidusService.fundWithProvidus(
        organisationId,
      );
      Response.setSuccess(200, 'fund with providus', fundWithProvidus);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async createTicket(req, res) {
    const data = req.body;
    try {
      const rules = {
        email: 'required|email',
        subject: 'required|string',
        description: 'required|string',
        'contact.email': 'email',
        'contact.firstName': 'string',
        'contact.lastName': 'string',
      };
      console.log(data, 'data');

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      data.departmentId = '661286000000006907';
      // const createdTicket = await ZohoService.createTicket(data);
      const generate = await ZohoService.generatingToken();
      Response.setSuccess(201, 'Ticket Created Successfully', generate);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async createTicketOrg(req, res) {
    const data = req.body;
    try {
      const rules = {
        subject: 'required|string',
        description: 'required|string',
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      const member = await OrganisationService.isMemberUser(req.user.id);
      const organisation = await OrganisationService.findOneById(
        member.OrganisationId,
      );

      const org = organisation.Organisations[0];
      data.departmentId = '661286000000006907';
      data.email = org.email;
      data.contact = {
        firstName: organisation.first_name,
        lastName: organisation.first_name,
        phone: org.phone,
        email: org.email,
      };

      const createdTicket = await ZohoService.createTicket(data);
      Response.setSuccess(201, 'Ticket Created Successfully', createdTicket);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async fetchToken(req, res) {
    try {
      const token = await ZohoService.fetchToken();
      Response.setSuccess(201, 'Ticket Created Successfully', token);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async destroyToken(req, res) {
    try {
      const token = await ZohoService.destroy(req.query.id);
      Response.setSuccess(201, 'success', token);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }

  static async saveToken(req, res) {
    try {
      const token = await ZohoService.saveToken(req.body);
      Response.setSuccess(201, 'success', token);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`,
      );
      return Response.send(res);
    }
  }
}

module.exports = OrganisationController;
