const {
  Product,
  ProductCategory,
  User,
  CampaignVendor,
  VendorProposal,
  Sequelize
} = require('../models');

const {AclRoles} = require('../utils');

const {userConst} = require('../constants');

const VendorService = require('./VendorService');
const CampaignService = require('./CampaignService');

class ProductService {
  static addCategoryType(categoryType) {
    return ProductCategory.create(categoryType);
  }

  static fetchMyProposals(vendor_id) {
    return VendorProposal.findAll({
      where: {
        vendor_id
      }
    });
  }

  static async addDefaultCategory(organisation_id = null) {
    return await ProductCategory.bulkCreate([
      {
        name: 'Education',
        description: 'Education',
        organisation_id
      },
      {
        name: 'Fresh Food Items',
        description: 'Fresh Food Items',
        organisation_id
      },
      {
        name: 'Processed Food Items',
        description: 'Processed Food Items',
        organisation_id
      },
      {
        name: 'Clothing',
        description: 'Clothing',
        organisation_id
      },
      {
        name: 'Medicine',
        description: 'Medicine',
        organisation_id
      },
      {
        name: 'Cash',
        description: 'Cash',
        organisation_id
      },
      {
        name: 'Hygiene Items',
        description: 'Hygiene Items',
        organisation_id
      },
      {
        name: 'Humanitarian Overhead',
        description: 'Humanitarian Overhead',
        organisation_id
      }
    ]);
  }

  static fetchCategoryTypes(organisation_id = null) {
    return ProductCategory.findAll({
      where: {organisation_id},
      order: [['createdAt', 'DESC']]
    });
  }

  static findCategoryById(id) {
    return ProductCategory.findByPk(id);
  }
  static findCategoryType(where = {}) {
    return ProductCategory.findOne({
      where
    });
  }

  static addSingleProduct(product) {
    return Product.create(product);
  }
  static addProduct(product, vendors, CampaignId) {
    return Promise.all(
      vendors.map(async UserId => {
        await CampaignService.approveVendorForCampaign(CampaignId, UserId);
        return (await VendorService.findVendorStore(UserId)).createProduct({
          ...product,
          CampaignId
        });
      })
    );
  }

  static async findProduct(where) {
    return Product.findAll({
      where: {
        ...where
      }
    });
  }
  static vendorProposal(user_id, proposal_id) {
    return User.findOne({
      where: {
        id: user_id,
        proposal_id: Sequelize.where(
          Sequelize.col('proposalOwner.proposal_id'),
          proposal_id
        )
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: VendorProposal,
          as: 'proposalOwner',
          include: ['proposal_products']
        }
      ]
    });
  }
  static vendorProposals(proposal_id) {
    return VendorProposal.findAll({
      where: {
        proposal_id
      }
    });
  }
  static findCampaignProducts(CampaignId) {
    return Product.findAll({
      where: {CampaignId},
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: {
            include: userConst.publicAttr
          },
          as: 'ProductVendors'
        }
      ]
    });
  }

  static ProductVendors(CampaignId) {
    return CampaignVendor.findAll({
      where: {CampaignId}
    });
  }

  static findCampaignProduct(CampaignId, productId) {
    return Product.findOne({
      where: {CampaignId, id: productId},
      include: [{model: User, as: 'ProductVendors'}]
    });
  }

  static findProductByVendorId(id, vendorId, extraClause = null) {
    return Product.findOne({
      where: {
        id,
        ...extraClause
      },
      include: [
        {
          model: User,
          as: 'ProductVendors',
          attribute: [],
          where: {
            id: vendorId
          }
        }
      ]
    });
  }
}

module.exports = ProductService;
