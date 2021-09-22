const { Response } = require("../libs");
const { ProductService } = require('../services');
const { HttpStatusCode, SanitizeObject } = require('../utils');

class ProductController {
  static async addCampaignProduct(req, res) {
    try {
      const {body, vendors, campaign} = req;
      const data = SanitizeObject(body, ['type', 'tag', 'cost']);
      const products = await ProductService.addProduct(data, vendors, campaign);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Product added to stores', products);
      Response.send(res)
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }
}

module.exports = ProductController;