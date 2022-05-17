const { Response } = require("../libs");
const { ProductService, UserService } = require('../services');
const { HttpStatusCode, SanitizeObject } = require('../utils');
const db = require("../models");
class ProductController {
  static async getCampaignProduct(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const productId = req.params.productId
      const product = await ProductService.findCampaignProduct(campaignId, productId);


      const user = await UserService.getAllUsers()
      const campaign = await db.Campaign.findOne({where:{id: campaignId}})
      product.dataValues.campaign_status = campaign.status

 
    
    product.ProductVendors.forEach((data) => {
      var filteredKeywords = user.filter((user) => user.id === data.VendorId);
        data.dataValues.vendor = filteredKeywords[0]
});



      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Product.', product);
      return Response.send(res)
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, "Server Error. Unexpected error. Please retry."+ error);
      return Response.send(res);
    }
  }
}

module.exports = ProductController;