const {
  Product,
  Market,
  User,
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
    const RoleId = AclRoles.Vendor
    return User.findAll({
        where: {RoleId},
        attributes: userConst.publicAttr,
      include:[{model: Market, as: 'Store',
      include:[{
        model: Product,
        as: 'Products',
        where: {CampaignId},
        attributes: [
          // [Sequelize.fn('DISTINCT', Sequelize.col('product_ref')), 'product_ref'],
          'id',
          'tag',
          'cost',
          'type'
        ],
        group: ['product_ref', 'tag', 'cost', 'type']
      }]
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