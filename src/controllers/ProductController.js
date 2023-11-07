const {Response, Logger} = require('../libs');
const {
  ProductService,
  UserService,
  OrganisationService,
  CampaignService
} = require('../services');
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
      const [organisationUnique, categoryType] = await Promise.all([
        OrganisationService.getOrganisationByUUID(req.params.organisation_id),
        ProductService.addCategoryType(req.body)
      ]);
      req.body.organisation_id = organisationUnique.id;
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
      const [organisationUnique, categoryTypes] = await Promise.all([
        OrganisationService.getOrganisationByUUID(req.params.organisation_id),
        ProductService.fetchCategoryTypes(organisationUnique.id)
      ]);

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
      const [campaignUnique, productUnique, products, campaign] =
        await Promise.all([
          CampaignService.getCampaignByUUID(campaignId),
          ProductService.getProductByUUID(productId),
          ProductService.findCampaignProducts(
            campaignUnique.id,
            productUnique.id
          ),
          db.Campaign.findOne({where: {id: campaignUnique.id}})
        ]);

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
