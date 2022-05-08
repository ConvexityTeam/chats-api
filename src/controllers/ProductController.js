const { Response } = require("../libs");
const { ProductService } = require('../services');
const { HttpStatusCode, SanitizeObject } = require('../utils');

class ProductController {
  static async getCampaignProduct(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const productId = req.params.productId
      const product = await ProductService.findCampaignProduct(campaignId, productId);

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