class ProductService {
  static addProduct(product, vendors, campaign) {
    return Promise.all(
      vendors.map(vendor => vendor.Store.createProduct({...product, CampaignId: campaign.id}))
    );
  }

  static findProductByVendorId(id, vendorId) {
    return Product.findOne({
      where: { id },
      include: [
        {
          model: Market,
          as: 'Store',
          attribute: [],
          where: {UserId: vendorId}
        }
      ]
    })
  }
}

module.exports = ProductService;