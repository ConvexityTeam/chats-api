class ProductService {
  static addProduct(product, vendors, campaign) {
    
    return Promise.all(
      vendors.map(vendor => vendor.Store.createProduct({...product, CampaignId: campaign.id}))
    );
  }
}

module.exports = ProductService;