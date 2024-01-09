const {Sequelize, Op} = require('sequelize');
const {
  User,
  Wallet,
  Campaign,
  Complaint,
  Beneficiary,
  VoucherToken,
  ProposalRequest,
  FormAnswer,
  Market,
  VendorProposal,
  ProductCategory,
  Product,
  AssociatedCampaign,
  CampaignForm,
  Organisation,
  Task,
  CampaignVendor
} = require('../models');
const {userConst, userConstFilter, walletConst} = require('../constants');
const Transfer = require('../libs/Transfer');
const QueueService = require('./QueueService');
const {generateTransactionRef, AclRoles} = require('../utils');
const Pagination = require('../utils/pagination');
const {Logger} = require('../libs');
const {createWallet} = require('../utils/createWallet');

class CampaignService {
  static async findStoreByName(store_name) {
    return await Market.findOne({where: {store_name}});
  }
  static async addStore(data) {
    return await Market.create(data);
  }
  static async proposalRequest(data) {
    return await ProposalRequest.create(data);
  }
  static campaignHistory(id) {
    return Campaign.findByPk(id, {
      include: ['history']
    });
  }
  static getACampaignWithBeneficiaries(CampaignId, type) {
    return Campaign.findAll({
      where: {
        type,
        id: {
          [Op.ne]: CampaignId
        }
      },
      include: ['Beneficiaries']
    });
  }

  static getACampaignWithReplica(id, type) {
    return Campaign.findByPk(id, {
      where: {
        type
      },
      include: ['Beneficiaries']
    });
  }

  static searchCampaignTitle(title, extraClause = null) {
    const where = {
      ...extraClause,
      title: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('title')),
        'LIKE',
        `%${title.toLowerCase()}%`
      )
    };

    return Campaign.findOne({
      where
    });
  }

  static getCampaignToken(campaignId) {
    return VoucherToken.findAll({where: {campaignId}});
  }
  static async getCampaign(id) {
    return Campaign.findByPk(id, {
      attributes: ['total_beneficiaries', 'total_imported', 'fund_status']
    });
  }
  static getCampaignById(id) {
    return Campaign.findByPk(id, {
      include: ['Organisation'],
      include: {
        model: User,
        as: 'Beneficiaries',
        attributes: [
          'first_name',
          'last_name',
          'gender',
          'marital_status',
          'dob',
          'location'
        ]
      }
    });
  }
  static getPubCampaignById(id) {
    return Campaign.findOne({where: {id, is_public: true}});
  }

  static getCleanCampaignById(id) {
    return Campaign.findByPk(id);
  }

  static campaignBeneficiaryExists(CampaignId, UserId) {
    return Beneficiary.findOne({
      where: {
        CampaignId,
        UserId
      }
    });
  }

  static findAllBeneficiaryOnboard(CampaignId, UserId) {
    return Beneficiary.findAll({
      where: {
        CampaignId,
        UserId
      }
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

  static async addBeneficiaries(
    CampaignId,
    UserId,
    campaign,
    count,
    replicaCampaignLength,
    source = null
  ) {
    return new Promise(async (resolve, reject) => {
      Logger.info(`replicaCampaignLength: ${replicaCampaignLength}`);
      Logger.info(`count: ${count}`);
      Logger.info(`campaign: ${campaign}`);
      try {
        const find = await Beneficiary.findOne({
          where: {
            CampaignId,
            UserId
          }
        });
        if (find) {
          return resolve(find);
        }
        const newBeneficiary = await Beneficiary.create({
          CampaignId,
          UserId,
          source
        });
        await CampaignService.updateCampaign(CampaignId, {
          total_beneficiaries: count,
          total_imported: replicaCampaignLength
        });
        // await campaign.update({
        //   total_imported: count,
        //   total_beneficiaries: replicaCampaignLength
        // });
        await QueueService.createWallet(UserId, 'user', CampaignId);
        return resolve(newBeneficiary);
      } catch (error) {
        return reject(error);
      }
    });
  }
  static async addBeneficiary(CampaignId, UserId, source = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const find = await Beneficiary.findOne({
          where: {
            CampaignId,
            UserId
          }
        });
        if (find) {
          return resolve(find);
        }
        const newBeneficiary = await Beneficiary.create({
          CampaignId,
          UserId,
          source
        });

        await createWallet(UserId, 'user', CampaignId);
        return resolve(newBeneficiary);
      } catch (error) {
        return reject(error);
      }
    });
  }

  static removeBeneficiary(CampaignId, UserId) {
    return Beneficiary.destroy({
      where: {
        CampaignId,
        UserId
      }
    }).then(res => {
      if (res) {
        return Wallet.destroy({
          where: {
            wallet_type: 'user',
            CampaignId,
            UserId
          }
        });
      }
      return null;
    });
  }

  static async approveVendorForCampaign(CampaignId, VendorId) {
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

    return await CampaignVendor.create({
      CampaignId,
      VendorId,
      approved: true
    });
  }

  static async removeVendorForCampaign(CampaignId, VendorId) {
    const record = await CampaignVendor.findOne({
      where: {
        CampaignId,
        VendorId
      }
    });
    if (record) {
      await record.destroy({
        CampaignId,
        VendorId
      });
      return record;
    }

    return null;
  }

  static async campaignVendors(CampaignId, extraClause = null) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const vendors = await CampaignVendor.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...queryOptions,
      distinct: true,
      where: {
        ...extraClause,
        //attributes: [[sequelize.fn('DISTINCT', sequelize.col('column_name')), 'column_name']],
        CampaignId
      },
      include: {
        model: User,
        as: 'Vendor',
        attributes: userConstFilter.publicAttr
      }
    });
    return await Pagination.getPagingData(vendors, page, limit);
  }

  static async getCampaignVendor(VendorId, CampaignId) {
    return CampaignVendor.findOne({
      where: {
        VendorId,
        CampaignId
      }
    });
  }
  static async getVendorCampaigns(VendorId) {
    return CampaignVendor.findAll({
      where: {
        VendorId
      },
      include: ['Campaign']
    });
  }

  static async getVendorCampaignsAdmin(VendorId) {
    return CampaignVendor.findAll({
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: ['first_name', 'last_name'],
          where: {
            vendor_id: VendorId
          }
        }
      ]
    });
  }
  static getPrivateCampaignWithBeneficiaries(id) {
    return Campaign.findOne({
      order: [['createdAt', 'ASC']],
      where: {
        id,
        is_public: false
      },
      // attributes: {
      //   include: [
      //     [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
      //   ]
      // },
      include: [
        {
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr,
          through: {
            attributes: []
          }
        },
        {model: Task, as: 'Jobs'},
        {
          model: Wallet,
          as: 'BeneficiariesWallets',
          attributes: walletConst.walletExcludes
        }
      ],
      group: [
        'Campaign.id',
        'Beneficiaries.id',
        'Jobs.id',
        'BeneficiariesWallets.uuid'
      ]
    });
  }
  static getCampaignWithBeneficiaries(id) {
    return Campaign.findOne({
      order: [['createdAt', 'DESC']],
      where: {
        id
      },
      // attributes: {
      //   include: [
      //     [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
      //   ]
      // },
      include: [
        {
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr,
          through: {
            attributes: []
          }
        },
        {model: Task, as: 'Jobs'},
        {
          model: Wallet,
          as: 'BeneficiariesWallets',
          attributes: walletConst.walletExcludes
        }
      ]
      // group: [
      //   'Campaign.id',
      //   'Beneficiaries.id',
      //   'Jobs.id',
      //   'BeneficiariesWallets.uuid'
      // ]
    });
  }

  static getCampaignComplaint(CampaignId) {
    return Complaint.findAll({
      where: {
        CampaignId
      },
      include: [
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
  }

  static beneficiaryCampaings(UserId, extraClasue = null) {
    return Beneficiary.findAll({
      where: {
        UserId
      },
      include: [
        {
          model: Campaign,
          where: {
            ...extraClasue
          },
          as: 'Campaign',
          include: ['Organisation']
        }
      ]
    });
  }

  static beneficiaryAppCampaigns(UserId, extraClasue = null) {
    return Beneficiary.findAll({
      where: {
        UserId
      },
      include: [
        {
          model: Campaign,
          where: {
            ...extraClasue
          },
          as: 'Campaign',
          include: ['Organisation']
        }
      ]
    });
  }

  static beneficiaryCampaingsAdmin(UserId) {
    return Beneficiary.findAll({
      where: {
        UserId
      },
      include: [
        {
          model: Campaign,
          as: 'Campaign',
          include: ['Organisation']
        }
      ]
    });
  }
  static getPublicCampaigns(queryClause = {}) {
    const where = queryClause;
    return Campaign.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        ...where
      },
      include: ['Organisation'],
      include: [
        {model: Task, as: 'Jobs'},
        {
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr
        }
      ]
    });
  }
  static async getPrivateCampaigns(extraClause = {}, id) {
    // const page = extraClause.page;
    // const size = extraClause.size;

    // const {limit, offset} = await Pagination.getPagination(page, size);
    // delete extraClause.page;
    // delete extraClause.size;
    // let queryOptions = {};
    // if (page && size) {
    //   queryOptions.limit = limit;
    //   queryOptions.offset = offset;
    // }
    const campaigns = await Organisation.findOne({
      where: {
        id
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          // ...queryOptions,
          model: Campaign,
          where: {
            ...extraClause,
            is_public: false
          },
          as: 'associatedCampaigns',

          include: [
            {model: Task, as: 'Jobs'},
            {
              model: User,
              as: 'Beneficiaries',
              attributes: userConstFilter.publicAttr
            }
          ]
        }
      ]
    });

    return campaigns;
    // return await Pagination.getPagingData(
    //   campaigns.associatedCampaigns,
    //   page,
    //   limit
    // );
  }

  static getPrivateCampaignsAdmin(id) {
    return Organisation.findOne({
      where: {
        id
      },
      order: [['updatedAt', 'DESC']],
      include: {
        model: Campaign,
        where: {
          is_public: false
        },
        as: 'associatedCampaigns',

        include: [
          {model: Task, as: 'Jobs'},
          {model: User, as: 'Beneficiaries'}
        ]
      }
    });
  }
  static getCash4W(OrganisationId) {
    return Campaign.findAll({
      where: {
        type: 'cash-for-work',
        OrganisationId
      },
      // attributes: {
      //   include: [
      //     [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
      //   ]
      // },
      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries'}
      ]
      // includeIgnoreAttributes: false,
      // group: [
      //   "Campaign.id"
      // ],
    });
  }

  static async fetchProposalRequest(id) {
    return await ProposalRequest.findOne({
      where: {
        id
      }
    });
  }

  static async fetchVendorProposalRequest(where = {}) {
    return await VendorProposal.findOne({
      where
    });
  }

  static async fetchProposal(id) {
    return await ProposalRequest.findOne({
      where: {
        id
      }
    });
  }
  static async fetchProposalForVendors(location, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      ...queryOptions,
      // where: Sequelize.literal(`JSON_CONTAINS(location.state, '${JSON.stringify(location.state)}')`),
      where: {
        location: {
          country: location.country
        }
      },

      attributes: [
        'id',
        'title',
        'description',
        'budget',
        'location',
        'end_date'
      ],

      include: [
        {
          model: Product,
          as: 'ProjectProducts'
        },
        {
          model: ProposalRequest,
          as: 'proposal_requests'
        }
      ]
    });
    const matchingItems = campaign.rows.filter(item => {
      const itemTags = item.location.state; // Assuming that `tags` is an array in your model
      return location.state.some(tag => itemTags.includes(tag));
    });
    const response = await Pagination.getPagingData(
      {rows: matchingItems},
      page,
      limit
    );
    return {...response, totalItems: matchingItems.length};
  }
  static async fetchProposalForVendor(location, id) {
    const campaign = await Campaign.findOne({
      where: {
        id,
        location: {
          country: location.country
        }
      },

      attributes: [
        'id',
        'title',
        'description',
        'budget',
        'location',
        'end_date'
      ],

      include: [
        {
          model: Product,
          as: 'ProjectProducts'
        },
        {
          model: ProposalRequest,
          as: 'proposal_requests'
        }
      ]
    });
    // const matchingItems = campaign.filter((item) => {
    //   const itemTags = item.location.state; // Assuming that `tags` is an array in your model
    //   return location.state.some((tag) => itemTags.includes(tag));
    // });

    return campaign;
  }

  static async fetchRequest(proposal_id, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }
    const request = await User.findAndCountAll({
      ...queryOptions,
      distinct: true,
      where: {
        RoleId: AclRoles.Vendor,
        proposal_id: Sequelize.where(
          Sequelize.col('proposalOwner.proposal_id'),
          proposal_id
        )
        // status: Sequelize.where(Sequelize.col('proposalOwner.status'), status)
      },
      attributes: userConst.publicAttr,
      include: [
        {
          where: {...extraClause},
          model: VendorProposal,
          as: 'proposalOwner'
        }
      ]
    });
    const response = await Pagination.getPagingData(request, page, limit);
    return response;
  }
  static async fetchProposalRequests(OrganisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const campaign = await ProposalRequest.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...queryOptions,
      where: {
        ...extraClause,
        organisation_id: OrganisationId
        // campaign_id: Sequelize.where(
        //   Sequelize.col('proposal_requests.campaign_id'),
        //   Op.ne,
        //   null
        // )
      },
      distinct: true,
      include: [
        {
          model: Campaign,
          as: 'campaign_requests',
          attributes: ['id', 'title', 'description', 'budget', 'location']
        }
      ]
      // group: ['Campaign.id', 'proposal_requests.id']
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return {...response, totalItems: campaign.rows.length};
  }

  static async getCampaigns(OrganisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...queryOptions,
      where: {
        ...extraClause,
        OrganisationId
      },
      distinct: true,
      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries', attributes: userConst.publicAttr}
      ]
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static async getFieldAppCampaigns(OrganisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...queryOptions,
      where: {
        ...extraClause,
        OrganisationId
      },
      distinct: true,
      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries', attributes: userConst.publicAttr}
      ]
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static getCash4W(OrganisationId) {
    return Campaign.findAll({
      where: {
        type: 'cash-for-work',
        OrganisationId
      },

      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries'}
      ]
    });
  }

  static async updateSingleCampaign(id, update) {
    return new Promise(async (resolve, reject) => {
      try {
        const updated = await Campaign.update(update, {
          where: {
            id
          }
        });
        Logger.info(
          `CampaignService.updateSingleCampaign: ${JSON.stringify(updated)}`
        );
        resolve(updated);
      } catch (error) {
        Logger.error(`CampaignService.updateSingleCampaign: ${error}`);
        reject(error);
      }
    });
  }

  // static async getAllCampaigns(OrganisationId) {
  //   return Campaign.findAll({
  //     order: [['createdAt', 'DESC']],
  //     attributes: [
  //       [Sequelize.fn('sum', Sequelize.col('minting_limit')), 'total_items'],
  //       [Sequelize.fn('sum', Sequelize.col('minting_limit')), 'total_cash']
  //     ],
  //     where: {
  //       is_funded: true,
  //       OrganisationId
  //     },
  //     include: ['Organisation']
  //   });
  // }
  static async getAllCampaigns(extraClause = null) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);

    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      ...options,
      where: {
        ...extraClause
      },
      include: ['Organisation']
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static async getAllBeneficiaryCampaigns(extraClause = null) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);

    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      ...options,
      where: {
        ...extraClause
      },
      include: ['Organisation']
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static async getOurCampaigns(
    userId,
    OrganisationId,
    campaignType = 'campaign'
  ) {
    try {
      return await Campaign.findAll({
        where: {
          OrganisationId: OrganisationId,
          type: campaignType
        }
      });
    } catch (error) {
      // console.log(error)
      throw error;
    }
  }
  static async getAllFieldAgentCampaigns(extraClause = null) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);

    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      ...options,
      where: {
        ...extraClause
      },
      include: ['Organisation']
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static async getOurCampaigns(
    userId,
    OrganisationId,
    campaignType = 'campaign'
  ) {
    try {
      return await Campaign.findAll({
        where: {
          OrganisationId: OrganisationId,
          type: campaignType
        }
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
      // Approve Fund For Campaign
      payload.forEach(element => {
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
        }
      });

      if (CampaignToUpdate) {
        return await Campaign.update(updateCampaign, {
          where: {
            id: Number(id)
          }
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
      include: ['Beneficiaries']
    });
  }
  static async deleteCampaign(id) {
    try {
      const CampaignToDelete = await Campaign.findOne({
        where: {
          id: Number(id)
        }
      });

      if (CampaignToDelete) {
        const deletedCampaign = await Campaign.destroy({
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

  static cashForWorkCampaignByApprovedBeneficiary() {
    return Campaign.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        type: 'cash-for-work'
      },
      include: [
        {
          model: Beneficiary,
          as: 'Beneficiaries',
          attribute: [],
          where: {
            approved: true
          }
        }
      ]
    });
  }

  static cash4work(id, campaignId) {
    return User.findOne({
      where: {id},
      attributes: userConst.publicAttr,
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          where: {
            type: 'cash-for-work',
            id: campaignId
          },
          include: {model: Task, as: 'Jobs'}
        }
      ]
    });
  }

  static cash4workfield(id) {
    return Campaign.findOne({
      where: {
        type: 'cash-for-work',
        id
      },
      include: {model: Task, as: 'Jobs'}
    });
  }
  static async getPrivateCampaignWallet(id) {
    return Campaign.findOne({
      where: {
        id: Number(id),
        OrganisationId: {
          [Op.ne]: null
        }
      },
      include: {
        model: Wallet,
        as: 'Wallet'
      }
      // include: ["Beneficiaries"],
    });
  }

  static async getCampaignWallet(id, OrganisationId) {
    return Campaign.findOne({
      where: {
        id: Number(id),
        OrganisationId
      },
      include: [
        {
          model: Wallet,
          as: 'Wallet'
        }
      ]
      // include: ["Beneficiaries"],
    });
  }

  static async getWallet(address) {
    return Wallet.findAll({
      where: {
        address
      }
    });
  }

  static async formAnswer(data) {
    return await FormAnswer.create(data);
  }
  static async findCampaignForm(id) {
    return await CampaignForm.findOne({
      where: {id},
      include: ['campaigns']
    });
  }
  static async findCampaignFormAnswer(where) {
    return await FormAnswer.findOne({
      where
    });
  }
  static async findCampaignFormAnswers(where) {
    return await FormAnswer.findAll({
      where
    });
  }
  static async findCampaignFormBeneficiary(id) {
    return await CampaignForm.findOne({
      where: {id},
      include: {
        model: Campaign,
        as: 'campaigns',
        where: {id}
      }
    });
  }
  static async findCampaignFormByTitle(title) {
    return await CampaignForm.findOne({
      where: {title}
    });
  }
  static async findCampaignFormById(id) {
    return await CampaignForm.findOne({
      where: {id}
    });
  }
  static async findCampaignFormByCampaignId(id) {
    return await Campaign.findOne({
      where: {id},
      include: ['campaign_form']
    });
  }
  static async campaignForm(data) {
    return await CampaignForm.create(data);
  }
  static async getCampaignForm(organisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);
    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }

    const form = await CampaignForm.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      where: {organisationId, ...extraClause},
      ...options
      // include: ['campaigns']
    });
    const response = await Pagination.getPagingData(form, page, limit);
    return response;
  }
  static async getFieldAppCampaignForm(organisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);
    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }

    const form = await CampaignForm.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      where: {organisationId, ...extraClause},
      ...options
      // include: ['campaigns']
    });
    const response = await Pagination.getPagingData(form, page, limit);
    return response;
  }
}

module.exports = CampaignService;
