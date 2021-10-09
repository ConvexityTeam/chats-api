const { Response } = require("../libs");
const { ProductService } = require('../services');
const { HttpStatusCode, SanitizeObject } = require('../utils');

class ProductController {
  static async addCampaignProduct(req, res) {
    try {
      const {body, campaign} = req;
      const products = await  Promise.all(body.map(
        _body => {
          const data = SanitizeObject(_body, ['type', 'tag', 'cost']);
          return ProductService.addProduct(data, _body.vendors, campaign.id);
        }
      ));
       
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