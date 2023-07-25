const {Response, Logger} = require('../libs');
const {ProductService, UserService} = require('../services');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const Validator = require('validatorjs');

const db = require('../models');
class ProductController {
  static async addCategoryType(req, res) {
    try {
      const {name} = req.body;

      const rules = {
        name: 'required|string',
        description: 'string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const find = await ProductService.findCategoryType({name});
      if (find) {
        Response.setError(422, 'Category type already exists');
        return Response.send(res);
      }
      req.body.organisation_id = req.params.organisation_id;
      const categoryType = await ProductService.addCategoryType(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Category Type Created.',
        categoryType
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(`ProductController.addCategoryType: ${error}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async fetchCategoryTypes(req, res) {
    try {
      const categoryTypes = await ProductService.fetchCategoryTypes(
        req.params.organisation_id
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Category Types fetched.',
        categoryTypes
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(`ProductController.fetchCategoryTypes: ${error}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }
  static async getCampaignProduct(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const productId = req.params.productId;
      const products = await ProductService.findCampaignProduct(
        campaignId,
        productId
      );

      const campaign = await db.Campaign.findOne({where: {id: campaignId}});
      products.dataValues.campaign_status = campaign.status;

      products.ProductVendors.forEach(vendor => {
        vendor.dataValues.VendorName =
          vendor.first_name + ' ' + vendor.last_name;
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Product.',
        products
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.' + error
      );
      return Response.send(res);
    }
  }
}

module.exports = ProductController;
