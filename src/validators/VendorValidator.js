const {
  body,
} = require('express-validator');
const {
  Response,
} = require('../libs');
const {
  HttpStatusCode,
} = require('../utils');
const {
  VendorService,
  ProductService,
} = require('../services');
const BaseValidator = require('./BaseValidator');
// const ProductValidator = require('./ProductValidator');
const {
  CampaignVendor,
  OrganisationMembers,
} = require('../models');

class VendorValidator extends BaseValidator {
  static createOrder = [
    body('campaign_id')
      .notEmpty()
      .withMessage('Campaign Id is required.')
      .isNumeric()
      .withMessage('Campaign Id must be nuemric.'),
    body('products')
      .isArray({
        min: 1,
      })
      .withMessage('Minimum of 1 product is required.'),
    body('products.*.quantity')
      .isInt({
        min: 1,
        allow_leading_zeroes: false,
      })
      .withMessage('Product quantity must be numeric and allowed minimum is 1'),
    body('products.*.product_id')
      .isInt()
      .withMessage('Product has invalid ID. ID must be numeric.')
      .custom(VendorValidator.vendorHasProduct),
    this.validate,
  ];

  static createVendorRules() {
    return [
      body('first_name')
        .not().isEmpty()
        .withMessage('Vendor first name is required.'),
      body('last_name')
        .not().isEmpty()
        .withMessage('Vendor last name is required.'),
      body('email')
        .isEmail()
        .withMessage('Email is not well formed.'),
      body('store_name')
        .not().isEmpty()
        .withMessage('Store name is required.'),
      body('location')
        .not().isEmpty()
        .withMessage('Location store is required.'),
      body('address')
        .not().isEmpty()
        .withMessage('Store address is required.'),
      body('phone')
        .not().isEmpty()
        .withMessage('Phone is required.')
        .isMobilePhone()
        .withMessage('Phone number is well formed.'),
    ];
  }

  static approveCampaignVendor = [
    body('vendor_id')
      .notEmpty().bail()
      .withMessage('Vendor Id is required.')
      .isNumeric()
      .withMessage('Vendor Id must be numeric.')
      .custom(VendorValidator.checkOrgVendor),
    this.validate,
  ];

  static async VendorStoreExists(req, res, next) {
    try {
      if (!req.body.store_name) {
        next();
        return;
      }
      const existing = await VendorService.searchVendorStore(req.body.store_name);
      if (existing) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          'Validation Failed!',
          {
            store_name: ['Store is registered!'],
          },
        );
        Response.send(res);
        return;
      }
      next();
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Error occured. Contact support.');
      Response.send(res);
    }
  }

  static async VendorExists(req, res, next) {
    try {
      const id = req.params.vendor_id || req.body.vendor_id || req.user.id;
      const vendor = await VendorService.getVendor(id);
      if (vendor) {
        req.vendor = vendor;
        return next();
      }
      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Invalid vendor account or vendor ID.');
      return Response.send(res);
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Error occured. Contact support.');
      return Response.send(res);
    }
  }

  static async VendorApprovedForCampaign(req, res, next) {
    try {
      const VendorId = req.params.vendor_id || req.body.vendor_id || req.user.id;
      const CampaignId = req.params.campaign_id || req.body.campaign_id || null;
      if (!CampaignId) {
        Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Invalid Campaign or Campaign ID.');
        return Response.send(res);
      }
      const approval = await CampaignVendor.findOne({
        where: {
          VendorId,
          CampaignId,
          approved: true,
        },
      });
      if (!approval) {
        Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Approval for campaign pending.');
        return Response.send(res);
      }
      next();
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Error occured. Contact support.');
      return Response.send(res);
    }
    return null;
  }

  static checkOrgVendor(vendorId, { req }) {
    return new Promise((resolve) => {
      const OrganisationId = req.body.organisation_id || req.params.organisation_id
      || req.query.organisation_id || req.organisatiion.id || null;
      if (!vendorId) {
        throw new Error('Vendor Id is required');
      }

      if (!OrganisationId) {
        throw new Error('Invalid Organisation. Provide vendor organisation.');
      }

      OrganisationMembers.findOne({
        where: {
          UserId: vendorId,
          OrganisationId,
        },
      })
        .then((record) => {
          if (!record) {
            throw new Error('Vendor is not organisation member.');
          }
          resolve(true);
        });
    });
  }

  static vendorHasProduct(id, { req }) {
    const vendorId = req.params.vendor_id || req.body.vendor_id || req.vendor.id;
    return new Promise((resolve) => {
      try {
        const CampaignId = req.body.campaign_id || req.params.campaign_id || null;
        const product = ProductService.findProductByVendorId(id, vendorId, {
          CampaignId,
        });
        if (!product) {
          throw new Error('Product not found in store.');
        }
        const foundProducts = {
          ...req.found_products,
        };
        foundProducts[id] = product.dataValues;
        req.found_products = foundProducts;
        resolve(true);
      } catch (error) {
        throw new Error('Product not found in store.');
      }
    });
  }
}

module.exports = VendorValidator;
