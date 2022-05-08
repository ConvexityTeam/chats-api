const {
  Product,
  Market,
  Campaign,
  User,
  CampaignVendor,
  Sequelize
} = require('../models');

const {
  AclRoles,
} = require("../utils");

const {
    userConst,
} = require('../constants');

const VendorService = require('./VendorService');
const CampaignService = require('./CampaignService');


class ProductService {
  static addProduct(product, vendors, CampaignId) {
    return Promise.all(vendors.map(
      async UserId => {
        await CampaignService.approveVendorForCampaign(CampaignId, UserId);
        return (await VendorService.findVendorStore(UserId))
          .createProduct({
            ...product,
            CampaignId
          })
      }
    ));
  }




  static findCampaignProducts(CampaignId) {
    return Product.findAll({
      where: {CampaignId},
      include: [{model: CampaignVendor, as: 'ProductVendors',
    }]
    });
}

static findCampaignProduct(CampaignId, productId) {
    return Product.findOne({
      where: {CampaignId, productId},
      include: [{model: CampaignVendor, as: 'ProductVendors',
    }]
    });
}

  static findProductByVendorId(id, vendorId, extraClause = null) {
    return Product.findOne({
      where: {
        id,
        ...extraClause
      },
      include: [{
        model: Market,
        as: 'Store',
        attribute: [],
        where: {
          UserId: vendorId
        }
      }]
    })
  }
}

module.exports = ProductService;