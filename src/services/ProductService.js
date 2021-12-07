const {
  Product,
  Market,
  User
} = require('../models');

const VendorService = require('./VendorService');
const CampaignService = require('./CampaignService');


class ProductService {
  static addProduct(product, vendors, CampaignId) {
    console.log(CampaignService)
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