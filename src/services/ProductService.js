const { Op } = require('sequelize');
const {
  Product,
  ProductCategory,
  User,
  CampaignVendor,
  Campaign,
  VendorProposal,
  Sequelize,
} = require('../models');

const { userConst } = require('../constants');

const VendorService = require('./VendorService');
const CampaignService = require('./CampaignService');

class ProductService {
  static addCategoryType(categoryType) {
    return ProductCategory.create(categoryType);
  }

  static fetchOneMyProposals(extraClause = {}) {
    return VendorProposal.findOne({
      where: {
        ...extraClause,
        vendor_proposal_id: Sequelize.where(
          Sequelize.col('proposal_products.vendor_proposal_id'),
          Op.ne,
          null,
        ),
      },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: [
            'id',
            'OrganisationId',
            'title',
            'description',
            'budget',
            'end_date',
            'category_id',
          ],
        },
        { model: Product, as: 'proposal_products' },
      ],
    });
  }

  static fetchMyProposals(vendorId, extraClause = {}) {
    return VendorProposal.findAll({
      where: {
        vendor_id: vendorId,
        ...extraClause,
        vendor_proposal_id: Sequelize.where(
          Sequelize.col('proposal_products.vendor_proposal_id'),
          Op.ne,
          null,
        ),
      },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: [
            'id',
            'OrganisationId',
            'title',
            'description',
            'budget',
            'end_date',
            'category_id',
          ],
        },
        { model: Product, as: 'proposal_products' },
      ],
    });
  }

  static async addDefaultCategory(organisationId = null) {
    const response = await ProductCategory.bulkCreate([
      {
        name: 'Education',
        description: 'Education',
        organisation_id: organisationId,
      },
      {
        name: 'Fresh Food Items',
        description: 'Fresh Food Items',
        organisation_id: organisationId,
      },
      {
        name: 'Processed Food Items',
        description: 'Processed Food Items',
        organisation_id: organisationId,
      },
      {
        name: 'Clothing',
        description: 'Clothing',
        organisation_id: organisationId,
      },
      {
        name: 'Medicine',
        description: 'Medicine',
        organisation_id: organisationId,
      },
      {
        name: 'Cash',
        description: 'Cash',
        organisation_id: organisationId,
      },
      {
        name: 'Hygiene Items',
        description: 'Hygiene Items',
        organisation_id: organisationId,
      },
      {
        name: 'Humanitarian Overhead',
        description: 'Humanitarian Overhead',
        organisation_id: organisationId,
      },
    ]);
    return response;
  }

  static fetchCategoryTypes(organisationId = null) {
    return ProductCategory.findAll({
      where: { organisation_id: organisationId },
      order: [['createdAt', 'DESC']],
    });
  }

  static findCategoryById(id) {
    return ProductCategory.findByPk(id);
  }

  static findCategoryType(where = {}) {
    return ProductCategory.findOne({
      where,
    });
  }

  static addSingleProduct(product) {
    return Product.create(product);
  }

  static addProduct(product, vendors, CampaignId) {
    return Promise.all(
      vendors.map(async (UserId) => {
        await CampaignService.approveVendorForCampaign(CampaignId, UserId);
        return (await VendorService.findVendorStore(UserId)).createProduct({
          ...product,
          CampaignId,
        });
      }),
    );
  }

  static async findProduct(where) {
    return Product.findAll({
      where: {
        ...where,
      },
    });
  }

  static vendorProposal(userId, proposalId) {
    return User.findOne({
      where: {
        id: userId,
        proposal_id: Sequelize.where(
          Sequelize.col('proposalOwner.proposal_id'),
          proposalId,
        ),
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: VendorProposal,
          as: 'proposalOwner',
          include: ['proposal_products'],
        },
      ],
    });
  }

  // vendor proposals
  static vendorProposals(proposalId) {
    return VendorProposal.findAll({
      where: {
        proposal_id: proposalId,
      },
    });
  }

  static findOneProposal(id, vendorId) {
    return VendorProposal.findOne({
      where: {
        id,
        vendor_id: vendorId,
      },
    });
  }

  static findCampaignProducts(CampaignId) {
    return Product.findAll({
      where: { CampaignId },
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: {
            include: userConst.publicAttr,
          },
          as: 'ProductVendors',
        },
      ],
    });
  }

  static ProductVendors(CampaignId) {
    return CampaignVendor.findAll({
      where: { CampaignId },
    });
  }

  static findCampaignProduct(CampaignId, productId) {
    return Product.findOne({
      where: { CampaignId, id: productId },
      include: [{ model: User, as: 'ProductVendors' }],
    });
  }

  static findProductByVendorId(id, vendorId, extraClause = null) {
    return Product.findOne({
      where: {
        id,
        ...extraClause,
      },
      include: [
        {
          model: User,
          as: 'ProductVendors',
          attribute: [],
          where: {
            id: vendorId,
          },
        },
      ],
    });
  }
}

module.exports = ProductService;
