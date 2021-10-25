const {
  Product,
  Market
} = require('../models');

const VendorService = require('./VendorService');

class ProductService {
  static addProduct(product, vendors, CampaignId) {
    return Promise.all(vendors.map(
      async UserId => {
        return (await VendorService.findVendorStore(UserId)).createProduct({
          ...product,
          CampaignId
        })
      }
    ));
  }

  static findProductByVendorId(id, vendorId) {
    return Product.findOne({
      where: {
        id
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