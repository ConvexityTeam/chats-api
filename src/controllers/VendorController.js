const db = require('../models');
const moment = require('moment');
const util = require('../libs/Utils');
const {
  VendorService,
  CampaignService,
  BlockchainService,
  OrderService,
  UserService,
  ProductService,
  SmsService,
  AuthService,
  QueueService
} = require('../services');
const Validator = require('validatorjs');
const sequelize = require('sequelize');
const uploadFile = require('./AmazonController');
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';
const {Op} = require('sequelize');

const codeGenerator = require('./../controllers/QrCodeController');
const {Response} = require('../libs');
const {
  HttpStatusCode,
  generateOrderRef,
  generateQrcodeURL,
  createHash,
  AclRoles,
  GenearteVendorId
} = require('../utils');
const {data} = require('../libs/Response');
const {user} = require('../config/mailer');
const formidable = require('formidable');
class VendorController {
  constructor() {
    this.emails = [];
  }

  static async submitProposal(req, res) {
    try {
      const rules = {
        proposal_id: 'required|integer',
        product_id: 'required|integer',
        quantity: 'required|integer',
        cost: 'required|numeric'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        if (validation.fails()) {
          Response.setError(422, Object.values(validation.errors.errors)[0][0]);
          return Response.send(res);
        }
      }
      req.body.vendor_id = req.user.id;
      const proposal = await VendorService.submitProposal(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Proposal submitted',
        proposal
      );
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async fetchSubmittedProposals(req, res) {
    const {proposal_id} = req.params;
    try {
      const proposals = await ProductService.vendorProposal({proposal_id});
      for (const proposal of proposals) {
        proposal.dataValues.vendor = await UserService.findSingleUser({
          id: proposal.vendor_id
        });
        const proposal_request = await CampaignService.fetchProposalRequest(
          proposal_id
        );
        const campaign = await CampaignService.getCampaignById(
          proposal_request.campaign_id
        );
        proposal.dataValues.campaign_id = campaign.id;
        proposal.dataValues.budget = campaign.budget;
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Proposals fetched',
        proposals
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async fetchDefaultCategory(req, res) {
    try {
      const categories = await db.ProductCategory.findAll({
        where: {organisation_id: null}
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Categories fetched',
        categories
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async addDefaultCategory(req, res) {
    try {
      const createdCategory = await db.ProductCategory.bulkCreate([
        {
          name: 'Clothing',
          description: 'Clothing'
        },
        {
          name: 'Medicine',
          description: 'Medicine'
        },
        {
          name: 'Cash',
          description: 'Cash'
        },
        {
          name: 'Hygiene Items',
          description: 'Hygiene Items'
        },
        {
          name: 'Fresh Food Items',
          description: 'Fresh Food Items'
        },
        {
          name: 'Others',
          description: 'Others'
        },
        {
          name: 'Education',
          description: 'Education'
        },
        {
          name: 'Humanitarian Overhead',
          description: 'Humanitarian Overhead'
        }
      ]);

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Category added',
        createdCategory
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async addMarket(req, res) {
    const {store_name} = req.body;
    try {
      const rules = {
        store_name: 'required|string',
        country: 'required|alpha',
        state: 'required|alpha',
        website_url: 'url',
        category_id: 'required|string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const findStore = await CampaignService.findStoreByName(store_name);
      if (findStore) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Store already registered'
        );
        return Response.send(res);
      }
      req.body.UserId = req.user.id;
      req.body.location = {
        country: req.body.country,
        state: req.body.state
      };
      const createdStore = await CampaignService.addStore(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Store registered',
        createdStore
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async fetchBusiness(req, res) {
    try {
      const businesses = await db.Business.findAll({
        where: {vendorId: req.user.id}
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Businesses fetched',
        businesses
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async addBusiness(req, res) {
    try {
      var form = new formidable.IncomingForm({
        multiples: true
      });
      form.parse(req, async (err, fields, files) => {
        const rules = {
          name: 'string',
          bizId: 'required|string',
          accountId: 'required|integer'
        };
        const validation = new Validator(fields, rules);
        if (validation.fails()) {
          Response.setError(422, Object.values(validation.errors.errors)[0][0]);
          return Response.send(res);
        }
        if (!files) {
          Response.setError(400, 'Document is required');
          return Response.send(res);
        }
        const findBusiness = await db.Business.findOne({
          where: {
            bizId: fields.bizId
          }
        });
        if (findBusiness) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Business already registered'
          );
          return Response.send(res);
        }
        const createdBusiness = await db.Business.create({
          name: fields.name,
          bizId: fields.bizId,
          accountId: fields.accountId,
          vendorId: req.user.id
        });

        const extension = files.document.name.substring(
          files.document.name.lastIndexOf('.') + 1
        );
        await uploadFile(
          files.document,
          'u-' + environ + '-' + req.user.id + '-i.' + extension,
          'chats-vendor-document'
        ).then(url => {
          createdBusiness.update({
            document: url
          });
        });

        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Business registered',
          createdBusiness
        );
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
    }
  }
  static async registeredSelf(req, res) {
    const {email} = req.body;
    try {
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'required|email',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        password: 'required|string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const user = await UserService.findSingleUser({email});
      if (user) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'User already registered'
        );
        return Response.send(res);
      }
      req.body.password = createHash(req.body.password);
      req.body.RoleId = AclRoles.Vendor;
      req.body.vendor_id = GenearteVendorId();
      const createdUser = await UserService.addUser(req.body);
      createdUser.password = null;
      await AuthService.createPasswordToken(createdUser.id, req.ip);
      await QueueService.createWallet(createdUser.id, 'user');

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'User registered',
        createdUser
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }

  static async confirmOTP(req, res) {
    try {
      await req.user.update({is_otp_verified: true});
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'OTP verified.');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Reset password request failed. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  static async resendPasswordToken(req, res) {
    const {UserId} = req.body;
    try {
      const passwordToken = await db.OneTimePassword.findOne({
        where: {
          UserId
        }
      });
      if (!passwordToken) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'One time token not found'
        );
        return Response.send(res);
      }
      const otp = await AuthService.resendPasswordToken(UserId, passwordToken);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'OTP has been sent to your phone.',
        otp
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  static async ProposalRequests(req, res) {
    try {
      const campaigns = await CampaignService.fetchProposalForVendors(
        req.query
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Proposals fetched',
        campaigns
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async approveProposal(req, res) {
    const {campaign_id, vendor_id, product_id, proposal_id} = req.body;
    try {
      const rules = {
        campaign_id: 'required|integer',
        vendor_id: 'required|integer',
        product_id: 'required|integer',
        proposal_id: 'required|integer'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        if (validation.fails()) {
          Response.setError(422, Object.values(validation.errors.errors)[0][0]);
          return Response.send(res);
        }
      }
      const [campaign, vendor, product, proposal] = await Promise.all([
        CampaignService.getCampaignById(campaign_id),
        UserService.getAUser(vendor_id),
        ProductService.findProduct({id: product_id}),
        CampaignService.fetchProposal(proposal_id)
      ]);
      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign not found'
        );
        return Response.send(res);
      }
      if (!vendor) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Vendor not found'
        );
        return Response.send(res);
      }
      if (!product) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Product not found'
        );
        return Response.send(res);
      }
      if (!proposal) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Proposal not found'
        );
        return Response.send(res);
      }
      await db.OrganisationMembers.create({
        UserId: vendor_id,
        OrganisationId: proposal.organisation_id,
        role: 'vendor'
      });
      await db.VendorProduct.create({
        vendorId: vendor_id,
        productId: product_id
      });
      await CampaignService.approveVendorForCampaign(campaign_id, vendor_id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Proposal approved');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async getAllVendors(req, res) {
    try {
      const allVendors = await VendorService.getAllVendors();
      util.setSuccess(200, 'Vendors retrieved', allVendors);
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async getVendor(req, res) {
    const id = req.params.id || req.user.id;

    try {
      const aVendor = await VendorService.getVendorData(id);
      const vToObject = aVendor.toObject();
      const token = await BlockchainService.balance(aVendor.Wallets[0].address);
      const balance = Number(token.Balance.split(',').join(''));
      vToObject.Wallets = aVendor.Wallets.map(wallet => {
        wallet.balance = balance;
        return wallet.toObject();
      });

      if (!aVendor) {
        util.setError(404, `Vendor not found.`);
      } else {
        util.setSuccess(200, 'Vendor Record Found', vToObject);
      }
      return util.send(res);
    } catch (error) {
      util.setError(500, 'Request Failed. Please retry.');
      return util.send(res);
    }
  }

  static async updateVendor(req, res) {
    try {
      const data = req.body;
      data['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'required|email',
        phone: 'required|string',
        address: 'required|string',
        location: 'required|string',
        bvn: 'required|numeric'
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        util.setError(422, validation.errors);
        return util.send(res);
      } else {
        var filterData = {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address,
          location: data.location,
          bvn: data.bvn,
          email: data.email
        };
        const email_exist = await db.User.findOne({
          where: {
            email: data.email
          }
        });
        if (!email_exist | (email_exist | (email_exist.email == data.email))) {
          if (!email_exist) {
            var user = await db.User.findByPk(req.user.id);
          } else {
            var user = email_exist;
          }
          await user.update(filterData),
            then(response => {
              util.setError(422, 'Vendor ');
              return util.send(res);
            });
        } else {
        }
      }
    } catch (error) {
      util.setError(422, error.message);
      return util.send(res);
    }
  }

  static async addAccount(req, res) {
    const data = req.body;
    const rules = {
      account_number: 'required|numeric',
      bank_name: 'required|string'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      await db.User.findByPk(req.user.id)
        .then(async user => {
          const account_exist = await db.Accounts.findOne({
            where: {
              UserId: req.user.id,
              account_number: data.account_number
            }
          });
          if (account_exist) {
            util.setError(400, 'Account Number already added');
            return util.send(res);
          } else {
            await user
              .createAccount({
                account_number: data.account_number,
                bank_name: data.bank_name
              })
              .then(response => {
                util.setSuccess(201, 'Account Added Successfully');
                return util.send(res);
              });
          }
        })
        .catch(error => {
          util.setError(404, 'Invalid User');
          return util.send(res);
        });
    }
  }

  static async getAllStores(req, res) {
    await db.Market.findAll().then(response => {
      util.setSuccess(201, 'Stores Retrieved', response);
      return util.send(res);
    });
  }

  static async getVendorStore(req, res) {
    const user_id = req.params.id;
    await db.User.findOne({
      where: {
        id: user_id
      }
    })
      .then(async user => {
        const stores = await user.getStore();
        if (stores) {
          util.setSuccess(200, 'Stores Retrieved', stores);
          return util.send(res);
        } else {
          util.setSuccess(204, 'No store registered under this vendor');
          return util.send(res);
        }
      })
      .catch(error => {
        util.setError(404, 'Invalid User');
        return util.send(res);
      });
  }

  static async getAccounts(req, res) {
    await db.User.findByPk(req.user.id)
      .then(async user => {
        const accounts = await user.getAccounts();
        if (accounts) {
          util.setSuccess(200, 'Accounts Retrieved', accounts);
          return util.send(res);
        } else {
          util.setSuccess(204, 'Vendor has no accounts registered');
          return util.send(res);
        }
      })
      .catch(error => {
        util.setError(404, 'Invalid User');
        return util.send(res);
      });
  }

  static async getAllProducts(req, res) {
    const products = await db.Product.findAll({
      include: {
        model: db.Market,
        as: 'Store'
      }
    });
    util.setSuccess(200, 'Products Retrieved', products);
    return util.send(res);
  }

  static async singleProduct(req, res) {
    const product = await db.Products.findOne({
      where: {
        id: req.params.id
      },
      include: {
        model: db.Market,
        as: 'Vendor'
      }
    });
    if (product) {
      let qr_code = await codeGenerator(product.id);
      util.setSuccess(200, 'Product Retrieved', {
        product,
        qr_code
      });
      return util.send(res);
    } else {
      util.setError(404, 'Invalid Product Id');
      return util.send(res);
    }
  }

  static async getProductByStore(req, res) {
    const products = await db.Products.findAll({
      where: {
        MarketId: req.params.storeId
      }
    });
    if (products) {
      util.setSuccess(200, 'Product Retrieved', products);
      return util.send(res);
    } else {
      util.setSuccess(200, 'Store has no products registered');
      return util.send(res);
    }
  }

  static async addProduct(req, res) {
    const data = req.body;
    const rules = {
      name: 'required|string',
      quantity: 'required|numeric',
      price: 'required|numeric'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      let vendorHasStore = await db.Market.findOne({
        where: {
          UserId: req.user.id
        }
      });

      if (!vendorHasStore) {
        util.setError(422, 'Unauthorised User');
        return util.send(res);
      }

      let productExist = await db.Products.findOne({
        where: {
          name: data.name,
          MarketId: vendorHasStore.id
        }
      });

      if (productExist) {
        util.setError(
          422,
          'Product with the same name has already been registered by Vendor'
        );
        return util.send(res);
      } else {
        await vendorHasStore
          .createProduct({
            name: data.name,
            quantity: data.quantity,
            price: data.price,
            MarketId: data.MarketId
          })
          .then(response => {
            util.setSuccess(200, 'Product Added Successfully');
            return util.send(res);
          });
      }
    }
  }
  static async getProductsValue(req, res) {
    await db.Products.findAll().then(products => {
      const sum = products.reduce((a, b) => {
        return Number(a) + Number(b.value);
      }, 0);
      util.setSuccess(200, 'Product Retrieved Successfully', {
        products,
        total_value: sum
      });
      return util.send(res);
    });
  }

  static async getSoldProductValue(req, res) {
    let orders = await db.OrderProducts.findAll({
      attributes: [
        [sequelize.fn('sum', sequelize.col('total_amount')), 'sum_value'],
        [sequelize.fn('sum', sequelize.col('quantity')), 'sum_quantity']
      ],
      raw: true
    });
    util.setSuccess(200, 'Order Retrieved', orders);
    return util.send(res);
  }
  static async getSummary(req, res) {
    try {
      const vendor = req.params.id;
      const user = await db.User.findOne({
        where: {
          id: vendor,
          RoleId: 4
        },
        include: [
          {
            as: 'Wallet',
            model: db.Wallet
          },
          {
            as: 'Store',
            model: db.Market,
            include: {
              model: db.Products,
              as: 'Products'
            }
          }
        ]
      });
      const transactions = await db.Transaction.findAndCountAll({
        where: {
          walletRecieverId: user.Wallet.uuid
        },
        attributes: [
          [sequelize.fn('sum', sequelize.col('amount')), 'sum_value']
        ],
        raw: true
      });
      const arr = user.Store.Products.map(element => {
        return element.id;
      });
      const soldProducts = await db.OrderProducts.sum('quantity', {
        where: {
          quantity: {
            [Op.in]: arr
          }
        }
      });
      util.setSuccess(200, 'Summary', {
        daily_transaction: transactions.count,
        transaction_value: transactions.rows.length
          ? transactions.rows[0].sum_value
          : 0,
        product_sold: soldProducts ? soldProducts : 0
      });
      return util.send(res);
    } catch (error) {
      util.setError(404, 'Invalid Vendor Id');
      return util.send(res);
    }
  }

  // Refactored
  static async vendorProducts(req, res) {
    try {
      const products = await VendorService.vendorStoreProducts(req.vendor.id);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Vendor products',
        products
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async vendorCampaigns(req, res) {
    try {
      const campaigns = await CampaignService.getVendorCampaigns(req.user.id);

      var dataArr = campaigns.map(campaign => {
        return [campaign.CampaignId, campaign];
      }); // creates array of array
      var maparr = new Map(dataArr); // create key value pair from array of array
      var result = [...maparr.values()]; //converting back to array from mapobject
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Vendor campaigns', result);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server error. Please retry`
      );
      return Response.send(res);
    }
  }

  static async vendorCampaignProducts(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      const products = await VendorService.vendorStoreProducts(req.vendor.id, {
        CampaignId
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Vendor Campaign products',
        products
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async createOrder(req, res) {
    try {
      const {
        found_products,
        body: {campaign_id, products}
      } = req;
      const VendorId = req.vendor.id;
      const reference = generateOrderRef();

      const cart = products.map(prod => ({
        quantity: prod.quantity,
        ProductId: prod.product_id,
        unit_price: found_products[prod.product_id].cost,
        total_amount: found_products[prod.product_id].cost * prod.quantity
      }));

      const order = await VendorService.createOrder(
        {VendorId, CampaignId: campaign_id, reference},
        cart
      );
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Create Order', order);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async getOrderById(req, res) {
    try {
      const VendorId = req.user.id;
      const id = req.params.order_id;
      const order = await VendorService.getOrder({id, VendorId});

      if (order) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Vendor Order', order);
        return Response.send(res);
      }
      Response.setError(
        HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
        `Vendor order not found.`
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async getVendorOrders(req, res) {
    try {
      const VendorId = req.user.id;
      const orders = await VendorService.findVendorOrders(VendorId);

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Vendor Orders', orders);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async vendorChart(req, res) {
    const {period} = req.params;
    try {
      const transactions = await VendorService.vendorChart(req.user.id, period);
      const vendor = await db.Wallet.findOne({where: {UserId: req.user.id}});

      if (transactions.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Transaction Found.',
          transactions
        );
        return Response.send(res);
      }

      for (let transaction of transactions.rows) {
        if (transaction.narration === 'Vendor Order') {
          const order = await OrderService.productPurchasedBy(
            transaction.OrderId
          );
          const product = order.Cart[0].Product;
          transaction.dataValues.type = product.type;
          transaction.dataValues.tag = product.tag;
          const beneficiary = await UserService.getAUser(
            transaction.BeneficiaryId
          );
          transaction.dataValues.beneficiary_name =
            beneficiary.first_name + ' ' + beneficiary.last_name;
          transaction.dataValues.narration = `Payment from (${
            beneficiary.first_name + ' ' + beneficiary.last_name
          })`;
          transaction.dataValues.transaction_type = 'credit';
        }
        if (transaction.dataValues.ReceiverWallet === null)
          delete transaction.dataValues.ReceiverWallet;
        if (transaction.dataValues.SenderWallet === null)
          delete transaction.dataValues.SenderWallet;
      }

      transactions.rows.forEach(transaction => {
        transaction.dataValues.BlockchainXp_Link = `https://testnet.bscscan.com/token/0xa31d8a40a2127babad4935163ff7ce0bbd42a377?a=${vendor.address}`;
      });

      const periods = transactions.rows.map(period =>
        moment(period.createdAt).format('ddd')
      );

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Transaction Recieved.', {
        periods,
        transactions
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
        error
      );
      return Response.send(res);
    }
  }

  static async verifySMStoken(req, res) {
    const token = req.params.smstoken;
    let smsToken = {};
    try {
      const isVerify = await db.VoucherToken.findOne({where: {token}});

      if (!isVerify) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'token not valid'
        );
        return Response.send(res);
      }
      const campaignAddress = await BlockchainService.setUserKeypair(
        `campaign_${isVerify.campaignId}`
      );
      const beneficiaryAddress = await BlockchainService.setUserKeypair(
        `user_${isVerify.beneficiaryId}campaign_${isVerify.campaignId}`
      );
      const tokenBalance = await BlockchainService.allowance(
        campaignAddress.address,
        beneficiaryAddress.address
      );
      const balance = Number(tokenBalance.Allowed.split(',').join(''));
      const campaign = await CampaignService.getCampaignById(
        isVerify.campaignId
      );
      if (campaign.status == 'completed') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already completed'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ended') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ended'
        );
        return Response.send(res);
      }
      const beneficiary = await UserService.findBeneficiary(
        isVerify.beneficiaryId
      );
      smsToken.CampaignId = campaign.id;
      smsToken.Campaign_title = campaign.title;
      smsToken.Approve_to_spend = balance;
      smsToken.Beneficiary = beneficiary;

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Transaction Recieved.',
        smsToken
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
        error
      );
      return Response.send(res);
    }
  }
  static async uploadprofilePic(req, res) {
    try {
      const isVendor = await VendorService.getVendor(req.user.id);
      if (!isVendor) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Vendor Not Found'
        );
        return Response.send(res);
      }
      const extension = req.file.mimetype.split('/').pop();

      const profile_pic = await uploadFile(
        req.file,
        'u-' + environ + '-' + isVendor.email + '-i.' + extension,
        'convexity-profile-images'
      );
      const upload = await req.user.update({profile_pic});
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Profile Image Uploaded',
        upload
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }
}

module.exports = VendorController;
