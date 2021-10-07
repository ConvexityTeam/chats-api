const db = require("../models");
var bcrypt = require("bcryptjs");
const util = require("../libs/Utils");
const {VendorService} = require("../services");
const Validator = require("validatorjs");
const sequelize = require("sequelize");
const { Op } = require("sequelize");

const codeGenerator = require("./../controllers/QrCodeController");
const { Response } = require("../libs");
const { HttpStatusCode } = require("../utils");

class VendorController {
  constructor() {
    this.emails = [];
  }
  static async getAllVendors(req, res) {
    try {
      const allVendors = await VendorService.getAllVendors();
      util.setSuccess(200, "Vendors retrieved", allVendors);
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async getVendor(req, res) {
    const id = req.params.id || req.user.id;

    try {
      const aVendor = await VendorService.getAVendor(id);
      const vToObject = aVendor.toObject();
      vToObject.Wallets = aVendor.Wallets.map(wallet => wallet.toObject());
      if (!aVendor) {
        util.setError(404, `Vendor not found.`);
      } else {
        util.setSuccess(200, "Vendor Record Found", vToObject);
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
      data["today"] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        email: "required|email",
        phone: "required|string",
        address: "required|string",
        location: "required|string",
        bvn: "required|numeric",
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
          email: data.email,
        };
        const email_exist = await db.User.findOne({
          where: { email: data.email },
        });
        if (!email_exist | (email_exist | (email_exist.email == data.email))) {
          if (!email_exist) {
            var user = await db.User.findByPk(req.user.id);
          } else {
            var user = email_exist;
          }
          await user.update(filterData),
            then((response) => {
              util.setError(422, "Vendor ");
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
      account_number: "required|numeric",
      bank_name: "required|string",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      await db.User.findByPk(req.user.id)
        .then(async (user) => {
          const account_exist = await db.Accounts.findOne({
            where: { UserId: req.user.id, account_number: data.account_number },
          });
          if (account_exist) {
            util.setError(400, "Account Number already added");
            return util.send(res);
          } else {
            await user
              .createAccount({
                account_number: data.account_number,
                bank_name: data.bank_name,
              })
              .then((response) => {
                util.setSuccess(201, "Account Added Successfully");
                return util.send(res);
              });
          }
        })
        .catch((error) => {
          util.setError(404, "Invalid User");
          return util.send(res);
        });
    }
  }

  static async getAllStores(req, res) {
    await db.Market.findAll().then((response) => {
      util.setSuccess(201, "Stores Retrieved", response);
      return util.send(res);
    });
  }

  static async getVendorStore(req, res) {
    const user_id = req.params.id;
    await db.User.findOne({ where: { id: user_id } })
      .then(async (user) => {
        const stores = await user.getStore();
        if (stores) {
          util.setSuccess(200, "Stores Retrieved", stores);
          return util.send(res);
        } else {
          util.setSuccess(204, "No store registered under this vendor");
          return util.send(res);
        }
      })
      .catch((error) => {
        util.setError(404, "Invalid User");
        return util.send(res);
      });
  }

  static async getAccounts(req, res) {
    await db.User.findByPk(req.user.id)
      .then(async (user) => {
        const accounts = await user.getAccounts();
        if (accounts) {
          util.setSuccess(200, "Accounts Retrieved", accounts);
          return util.send(res);
        } else {
          util.setSuccess(204, "Vendor has no accounts registered");
          return util.send(res);
        }
      })
      .catch((error) => {
        util.setError(404, "Invalid User");
        return util.send(res);
      });
  }

  static async getAllProducts(req, res) {
    const products = await db.Products.findAll({
      include: { model: db.Market, as: "Vendor" },
    });
    util.setSuccess(200, "Products Retrieved", products);
    return util.send(res);
  }

  static async singleProduct(req, res) {
    const product = await db.Products.findOne({
      where: { id: req.params.id },
      include: { model: db.Market, as: "Vendor" },
    });
    if (product) {
      let qr_code = await codeGenerator(product.id);
      util.setSuccess(200, "Product Retrieved", { product, qr_code });
      return util.send(res);
    } else {
      util.setError(404, "Invalid Product Id");
      return util.send(res);
    }
  }

  static async getProductByStore(req, res) {
    const products = await db.Products.findAll({
      where: { MarketId: req.params.storeId },
    });
    if (products) {
      util.setSuccess(200, "Product Retrieved", products);
      return util.send(res);
    } else {
      util.setSuccess(200, "Store has no products registered");
      return util.send(res);
    }
  }

  static async addProduct(req, res) {
    const data = req.body;
    const rules = {
      name: "required|string",
      quantity: "required|numeric",
      price: "required|numeric",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      let vendorHasStore = await db.Market.findOne({
        where: { UserId: req.user.id },
      });

      if (!vendorHasStore) {
        util.setError(422, "Unauthorised User");
        return util.send(res);
      }

      let productExist = await db.Products.findOne({
        where: { name: data.name, MarketId: vendorHasStore.id },
      });

      if (productExist) {
        util.setError(
          422,
          "Product with the same name has already been registered by Vendor"
        );
        return util.send(res);
      } else {
        await vendorHasStore
          .createProduct({
            name: data.name,
            quantity: data.quantity,
            price: data.price,
            MarketId: data.MarketId,
          })
          .then((response) => {
            util.setSuccess(200, "Product Added Successfully");
            return util.send(res);
          });
      }
    }
  }
  static async getProductsValue(req, res) {
    await db.Products.findAll().then((products) => {
      const sum = products.reduce((a, b) => {
        return Number(a) + Number(b.value);
      }, 0);
      util.setSuccess(200, "Product Retrieved Successfully", {
        products,
        total_value: sum,
      });
      return util.send(res);
    });
  }

  static async getSoldProductValue(req, res) {
    let orders = await db.OrderProducts.findAll({
      attributes: [
        [sequelize.fn("sum", sequelize.col("total_amount")), "sum_value"],
        [sequelize.fn("sum", sequelize.col("quantity")), "sum_quantity"],
      ],
      raw: true,
    });
    util.setSuccess(200, "Order Retrieved", orders);
    return util.send(res);
  }
  static async getSummary(req, res) {
    try {
      const vendor = req.params.id;
      const user = await db.User.findOne({
        where: { id: vendor, RoleId: 4 },
        include: [
          { as: "Wallet", model: db.Wallet },
          {
            as: "Store",
            model: db.Market,
            include: { model: db.Products, as: "Products" },
          },
        ],
      });
      const transactions = await db.Transaction.findAndCountAll({
        where: { walletRecieverId: user.Wallet.uuid },
        attributes: [
          [sequelize.fn("sum", sequelize.col("amount")), "sum_value"],
        ],
        raw: true,
      });
      const arr = user.Store.Products.map((element) => {
        return element.id;
      });
      const soldProducts = await db.OrderProducts.sum("quantity", {
        where: {
          quantity: {
            [Op.in]: arr,
          },
        },
      });
      util.setSuccess(200, "Summary", {
        daily_transaction: transactions.count,
        transaction_value: transactions.rows.length
          ? transactions.rows[0].sum_value
          : 0,
        product_sold: soldProducts ? soldProducts : 0,
      });
      return util.send(res);
    } catch (error) {
      util.setError(404, "Invalid Vendor Id");
      return util.send(res);
    }
  }

  // Refactored
  static async vendorProducts(req, res) {
    try {
      const products = await VendorService.vendorStoreProducts(req.vendor.id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Vendor products', products);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async createOrder(req, res) {
    const body = req.body;
    Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Create Order', body);
    return Response.send(res);
  }
}

module.exports = VendorController;
