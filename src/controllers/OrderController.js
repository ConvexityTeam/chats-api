const {Response, Logger} = require('../libs');
const moment = require('moment');
const {
  HttpStatusCode,
  compareHash,
} = require('../utils');

const {ProductBeneficiary} = require('../models');

const {
  VendorService,
  WalletService,
  UserService,
  OrderService,
  CampaignService,
  OrganisationService,
} = require('../services');
const db = require('../models');
const Utils = require('../libs/Utils');
class OrderController {
  static async getOrderByReference(req, res) {
    try {
      const reference = req.params.reference;
      const order = await VendorService.getOrder({reference});
      if (order) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', order);
        return Response.send(res);
      }

      Response.setError(
        HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
        'Order not found.',
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.',
      );
      return Response.send(res);
    }
  }
  static async comfirmsmsTOKEN(req, res) {
    const pin = req.body.pin;
    const id = req.body.beneficiaryId;
    const {reference} = req.params;
    try {
      const data = await VendorService.getOrder({reference});
      const user = await UserService.findSingleUser({id});
      if (!user) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid beneficiary',
        );
        return Response.send(res);
      }
      if (!compareHash(pin, user.pin)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid or wrong PIN.',
        );
        return Response.send(res);
      }

      if (!data) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Order not found.',
        );
        return Response.send(res);
      }

      if (data.order.status !== 'pending') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Order ${data.order.status}`,
        );
        return Response.send(res);
      }

      const campaignWallet = await WalletService.findSingleWallet({
        CampaignId: data.order.CampaignId,
        UserId: null,
      });
      const vendorWallet = await WalletService.findSingleWallet({
        UserId: data.order.Vendor.id,
      });
      const beneficiaryWallet = await WalletService.findUserCampaignWallet(
        id,
        data.order.CampaignId,
      );

      if (!beneficiaryWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Account not eligible to pay for order',
        );
        return Response.send(res);
      }
      if (!vendorWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Vendor Wallet Not Found..',
        );
        return Response.send(res);
      }
      if (!campaignWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Wallet Not Found..',
        );
        return Response.send(res);
      }

      if (campaignWallet.balance < data.total_cost) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.',
        );
        return Response.send(res);
      }
      if (beneficiaryWallet.balance < data.total_cost) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.',
        );
        return Response.send(res);
      }
      const transaction = await OrderService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        data.order,
        data.order.Vendor,
        data.total_cost,
      );

      Utils.setSuccess(
        HttpStatusCode.STATUS_OK,
        transaction.status,
        transaction,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
        error,
      );
      return Response.send(res);
    }
  }
  static async completeOrder(req, res) {
    try {
      const {reference} = req.params;
      const data = await VendorService.getOrder({reference});
      if (!data) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Order not found.',
        );
        return Response.send(res);
      }

      if (data.order.status !== 'pending') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Order ${data.order.status}`,
        );
        return Response.send(res);
      }

      const [
        campaignWallet,
        vendorWallet,
        beneficiaryWallet,
      ] = await Promise.all([
        WalletService.findSingleWallet({
          CampaignId: data.order.CampaignId,
          UserId: null,
        }),
        WalletService.findSingleWallet({UserId: data.order.Vendor.id}),
        WalletService.findUserCampaignWallet(
          req.user.id,
          data.order.CampaignId,
        ),
      ]);

      if (!beneficiaryWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Account not eligible to pay for order',
        );
        return Response.send(res);
      }
      if (!vendorWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Vendor Wallet Not Found..',
        );
        return Response.send(res);
      }
      if (!campaignWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Wallet Not Found..',
        );
        return Response.send(res);
      }

      if (campaignWallet.balance < data.total_cost) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.',
        );
        return Response.send(res);
      }

      if (beneficiaryWallet.balance < data.total_cost) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.',
        );
        Logger.error('Insufficient wallet balance.')
        return Response.send(res);
      }

      const transaction = await OrderService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        data.order,
        data.order.Vendor,
        data.total_cost,
      );
        Logger.info('transaction status: '+transaction.status)
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Order details',
        transaction,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.',
      );
      return Response.send(res);
    }
  }

  static async productPurchasedByGender(req, res) {
    try {
      const maleCount = {};
      const femaleCount = {};
      let gender = {male: [], female: []};
      const {organisation_id} = req.params;
      const filtered_data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id,
      });
      const products = await OrderService.productPurchased(organisation_id);

      if (products.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Product Purchased By Gender Recieved',
          gender,
        );
        return Response.send(res);
      }

      campaigns.forEach(campaign => {
        //CampaignId
        products.forEach(product => {
          if (campaign.id === product.CampaignId) {
            filtered_data.push(product);
          }
        });
      });
      filtered_data.forEach(product => {
        product.Cart.forEach(cart => {
          cart.Product.ProductBeneficiaries.forEach(beneficiary => {
            if (beneficiary.gender === 'male') {
              maleCount[cart.Product.tag] =
                (maleCount[cart.Product.tag] || 0) + 1;
            }
            if (beneficiary.gender === 'female') {
              femaleCount[cart.Product.tag] =
                (femaleCount[cart.Product.tag] || 0) + 1;
            }
          });
        });
      });

      gender.female.push(femaleCount);
      gender.male.push(maleCount);
      gender.male = gender.male.reduce((acc, obj) => {
        Object.keys(obj).forEach(key => {
          acc.push({[key]: obj[key]});
        });
        return acc;
      }, []);
      gender.female = gender.female.reduce((acc, obj) => {
        Object.keys(obj).forEach(key => {
          acc.push({[key]: obj[key]});
        });
        return acc;
      }, []);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product Purchased By Gender Received',
        gender,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.',
      );
      return Response.send(res);
    }
  }

  static async productPurchasedByAgeGroup(req, res) {
    try {
      const {organisation_id} = req.params;
      let ageRange = ['18-29', '30-41', '42-53', '54-65', '66~'];
      let data = [];
      const filtered_data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id,
      });
      const products = await OrderService.productPurchased(organisation_id);
      if (products.length > 0) {
        campaigns.forEach(campaign => {
          //CampaignId
          products.forEach(product => {
            if (campaign.id === product.CampaignId) {
              filtered_data.push(product);
            }
          });
        });
        filtered_data.forEach(product => {
          product.Cart.forEach(cart => {
            cart.Product.ProductBeneficiaries.forEach(beneficiary => {
              if (
                data.length <= 0 ||
                !data.find(val => val.label === cart.Product['tag'])
              ) {
                data.push({label: cart.Product['tag'], data: [0, 0, 0, 0, 0]});
              }
              for (let val of data) {
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) >= 18 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) <= 29
                ) {
                  val.data[0]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) >= 30 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) <= 41
                ) {
                  val.data[1]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) >= 42 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) <= 53
                ) {
                  val.data[2]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) >= 54 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) <= 65
                ) {
                  val.data[3]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY'),
                  ) >= 66
                ) {
                  val.data[4]++;
                }
              }
            });
          });
        });
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Product Purchased By Age Group Retrieved.',
          {ageRange, data},
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'No Product Purchased By Age Group Retrieved.',
        {ageRange, data},
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
      );
      return Response.send(res);
    }
  }

  static async productPurchased(req, res) {
    try {
      const {organisation_id} = req.params;
      let filtered_data = [];
      let data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id,
      });
      const products = await OrderService.productPurchased(organisation_id);

      if (products.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Product Purchased Received',
          products,
        );
        return Response.send(res);
      }
      campaigns.forEach(campaign => {
        //CampaignId
        products.forEach(product => {
          if (campaign.id === product.CampaignId) {
            filtered_data.push(product);
          }
        });
      });
      filtered_data.forEach(product => {
        product.Cart.forEach(cart => {
          if (
            data.length <= 0 ||
            !data.find(
              val =>
                val.vendorId == product.Vendor.id &&
                val.productId == cart.ProductId,
            )
          ) {
            data.push({
              productId: cart.ProductId,
              product_name: cart.Product.tag,
              vendorId: product.Vendor.id,
              vendor_name:
                product.Vendor.first_name + ' ' + product.Vendor.first_name,
              sales_volume: cart.total_amount,
              product_quantity: cart.quantity,
              product_cost: cart.Product.cost,
              total_revenue: cart.Product.cost * cart.quantity,
              date_of_purchased: cart.updatedAt,
            });
          }
          for (let val of data) {
            if (
              val.vendorId == product.Vendor.id &&
              val.productId == cart.ProductId
            ) {
              val.sales_volume +=
                (val.product_quantity + cart.quantity) *
                getMonthDifference(
                  new Date(val.date_of_purchased),
                  new Date(cart.updatedAt),
                );
              val.total_revenue += cart.Product.cost * cart.quantity;
              val.product_quantity += cart.quantity;
            }
          }
        });
      });

      function getMonthDifference(startDate, endDate) {
        return (
          endDate.getMonth() -
          startDate.getMonth() +
          12 * (endDate.getFullYear() - startDate.getFullYear())
        );
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product Purchased Received',
        data,
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.',
      );
      return Response.send(res);
    }
  }
  static async soldAndValue(req, res) {
    try {
      const {organisation_id} = req.params;
      const data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id,
      });
      const products = await OrderService.productPurchasedBy(organisation_id);

      if (products.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Product Purchased Received',
          products,
        );
        return Response.send(res);
      }
      campaigns.forEach(campaign => {
        //CampaignId
        products.forEach(product => {
          if (campaign.id === product.CampaignId) {
            data.push(product);
          }
        });
      });

      let total_product_value = 0;
      data.forEach(product => {
        product.Cart.forEach(cart => {
          total_product_value += cart.total_amount;
        });
      });
      let total_product_sold = data.length;

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product Purchased Received',
        {total_product_sold, total_product_value},
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.',
      );
      return Response.send(res);
    }
  }
}

module.exports = OrderController;
