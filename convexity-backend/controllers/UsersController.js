const UserService = require("../services/UserService");
const util = require("../libs/Utils");
const { Op } = require("sequelize");
const db = require("../models");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailer = require("../libs/Mailer");
const Validator = require("validatorjs");
const sequelize = require("sequelize");
const BeneficiariesServices = require("../services/BeneficiariesService");
const { Message } = require("@droidsolutions-oss/amqp-ts");
var amqp_1 = require("./../libs/RabbitMQ/Connection");

var transferFromQueue = amqp_1["default"].declareQueue("transferFrom", {
  durable: true,
});

class UsersController {
  static async getAllUsers(req, res) {
    try {
      const allUsers = await UserService.getAllUsers();
      if (allUsers.length > 0) {
        util.setSuccess(200, "Users retrieved", allUsers);
      } else {
        util.setSuccess(200, "No User found");
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async addUser(req, res) {
    if (!req.body.first_name || !req.body.last_name || !req.body.email) {
      util.setError(400, "Please provide complete details");
      return util.send(res);
    }
    // console.log(multer_config.profile_pic);
    // req.body.profile_pic = multer_config.profile_pic;
    console.table(req.files);
    console.log(newUser);
    try {
      const createdUser = await UserService.addUser(newUser);
      util.setSuccess(201, "User Added!", createdUser);
      return util.send(res);
    } catch (error) {
      console.log(error);
      util.setError(500, error.message);
      return util.send(res);
    }
  }

  static async updatedUser(req, res) {
    try {
      const data = req.body;
      data["today"] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        phone: "required|string",
        address: "required|string",
        location: "required|string",
        marital_status: "required|alpha|in:single,married",
        dob: "date|before:today",
        bvn: "numeric",
        nin: "numeric",
        id: "required|numeric",
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
          marital_status: data.marital_status,
          dob: data.dob,
          bvn: data.bvn,
          nin: data.nin,
        };

        var updateData = {};
        for (const index in filterData) {
          if (data[index]) {
            updateData[index] = data[index];
          }
        }
        const user_exist = await db.User.findByPk(data.id)
          .then(async (user) => {
            await user.update(updateData).then((response) => {
              util.setSuccess(200, "User Updated Successfully");
              return util.send(res);
            });
          })
          .catch((err) => {
            util.setError(404, "Invalid User Id");
            return util.send(res);
          });
      }
    } catch (error) {
      util.setError(422, error.message);
      return util.send(res);
    }
  }

  static async updateNFC(req, res) {
    try {
      const data = req.body;
      const rules = {
        nfc: "required|string",
        id: "required|numeric",
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        util.setError(422, validation.errors);
        return util.send(res);
      } else {
        await db.User.update(data, { where: { id: data.id } }).then(() => {
          util.setSuccess(200, "User NFC Data Updated Successfully");
          return util.send(res);
        });
      }
    } catch (error) {
      util.setError(422, error.message);
      return util.send(res);
    }
  }

  static async getAUser(req, res) {
    const { id } = req.params;

    if (!Number(id)) {
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }

    try {
      const theUser = await UserService.getAUser(id);
      if (!theUser) {
        util.setError(404, `Cannot find User with the id ${id}`);
      } else {
        util.setSuccess(200, "Found User", theUser);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error.toString());
      return util.send(res);
    }
  }

  static async resetPassword(req, res, next) {
    const email = req.body.email;
    try {
      //check if users exist in the db with email address
      db.User.findOne({ where: { email: email } })
        .then((user) => {
          //reset users email password
          if (user !== null) {
            //if there is a user
            //generate new password
            const newPassword = util.generatePassword();
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then((hash) => {
                const encryptedPassword = hash;
                return db.User.update(
                  { password: encryptedPassword },
                  {
                    where: { email: email },
                  }
                ).then((updatedRecord) => {
                  //mail user a new password
                  mailer.mailPassword(
                    email,
                    updatedRecord.firstName,
                    newPassword
                  );
                  //respond with a success message
                  res.status(201).json({
                    status: "success",
                    message:
                      "An email has been sent to the provided email address, kindly login to your email address to continue",
                  });
                });
              });
            });
          }
        })
        .catch((err) => {
          res.status(404).json({
            status: "error",
            error: err,
          });
        });
    } catch (error) {
      util.setError(500, "Internal Server Error " + error.toString);
      return util.send(res);
    }
  }

  static async updatePassword() {
    const { oldPassword, newPassword, confirmedPassword } = req.body;
    if (newPassword !== confirmedPassword) {
      return res.status(419).json({
        status: error,
        error: new Error("New Password Does not Match with Confirmed Password"),
      });
    }
    const userId = req.body.userId;
    db.User.findOne({
      where: {
        id: userId,
      },
    })
      .then((user) => {
        bcrypt
          .compare(oldPassword, user.password)
          .then((valid) => {
            if (!valid) {
              return res.status(419).json({
                status: error,
                error: new Error("Old Password provided is invalid"),
              });
            }
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then((hash) => {
                const role_id = 2;
                const encryptedPassword = hash;
                const balance = 0.0;
                return db.User.update(
                  {
                    password: encryptedPassword,
                  },
                  {
                    where: {
                      email: email,
                    },
                  }
                ).then((updatedRecord) => {
                  //mail user a new password
                  mailer.mailPassword(
                    email,
                    updatedRecord.firstName,
                    newPassword
                  );
                  //respond with a success message
                  res.status(201).json({
                    status: "success",
                    message:
                      "An email has been sent to the provided email address, kindly login to your email address to continue",
                  });
                });
              });
            });
          })
          .catch((err) => {
            //the two password does not match
            return res.status(419).json({
              status: error,
              error: new Error("Existing Password Error"),
            });
          });
      })
      .catch((err) => {
        res.status(404).json({
          status: "error",
          error: err,
        });
      });
  }

  static async deleteUser(req, res) {
    const { id } = req.params;

    if (!Number(id)) {
      util.setError(400, "Please provide a numeric value");
      return util.send(res);
    }

    try {
      const UserToDelete = await UserService.deleteUser(id);

      if (UserToDelete) {
        util.setSuccess(200, "User deleted");
      } else {
        util.setError(404, `User with the id ${id} cannot be found`);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async getBeneficiaryTransactions(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await BeneficiariesServices.getUser(beneficiary);
    if (beneficiary_exist) {
      const wallet = await beneficiary_exist.getWallet();

      await db.Transaction.findAll({
        where: {
          [Op.or]: [
            {
              walletSenderId: wallet.uuid,
            },
            {
              walletRecieverId: wallet.uuid,
            },
          ],
        },
      }).then((response) => {
        util.setSuccess(200, "Transactions Retrieved", response);
        return util.send(res);
      });
    } else {
      util.setError(422, "Beneficiary Id is Invalid");
      return util.send(res);
    }
  }

  static async getRecentTransactions(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await BeneficiariesServices.getUser(beneficiary);
    if (beneficiary_exist) {
      const wallet = await beneficiary_exist.getWallet();

      await db.Transaction.findAll({
        where: {
          [Op.or]: [
            {
              walletSenderId: wallet.uuid,
            },
            {
              walletRecieverId: wallet.uuid,
            },
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
      }).then((response) => {
        util.setSuccess(200, "Transactions Retrieved", response);
        return util.send(res);
      });
    } else {
      util.setError(422, "Beneficiary Id is Invalid");
      return util.send(res);
    }
  }

  static async getTransaction(req, res) {
    const uuid = req.params.uuid;
    const transaction_exist = await db.Transaction.findOne({
      where: {
        uuid: uuid,
      },
      include: ["SenderWallet", "RecievingWallet"],
    });
    if (transaction_exist) {
      util.setSuccess(200, "Transaction Retrieved", transaction_exist);
      return util.send(res);
    } else {
      util.setError(422, "Transaction Id is Invalid");
      return util.send(res);
    }
  }

  static async getStats(req, res) {
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const wallet = await db.User.findOne({
      where: { id: req.user.id },
      include: ["Wallet"],
    });
    const income = await db.Transaction.findAll({
      where: {
        walletRecieverId: wallet.Wallet.uuid,
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay,
        },
      },
      attributes: [[sequelize.fn("sum", sequelize.col("amount")), "income"]],
      raw: true,
    });
    const expense = await db.Transaction.findAll({
      where: {
        walletSenderId: wallet.Wallet.uuid,
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay,
        },
      },
      attributes: [[sequelize.fn("sum", sequelize.col("amount")), "expense"]],
      raw: true,
    });
    util.setSuccess(200, "Statistics Retrieved", [
      {
        balance: wallet.Wallet.balance,
        income: income[0].income == null ? 0 : income[0].income,
        expense: expense[0].expense == null ? 0 : expense[0].expense,
      },
    ]);
    return util.send(res);
  }

  static async getChartData(req, res) {
    const users = await db.User.findAll({
      where: { RoleId: 5, dob: { [Op.ne]: null } },
    });
    const gender_chart = { male: 0, female: 0 };
    const age_groups = {
      "18-29": 0,
      "30-41": 0,
      "42-53": 0,
      "54-65": 0,
      "65~": 0,
    };
    for (const user of users) {
      if (user.gender == "male") {
        gender_chart["male"] += 1;
      } else if (user.gender == "female") {
        gender_chart["female"] += 1;
      }

      const diff = getDifference(user.dob);
      if (diff >= 18 && diff <= 29) {
        age_groups["18-29"] += 1;
      } else if (diff >= 30 && diff <= 41) {
        age_groups["30-41"] += 1;
      } else if (diff >= 42 && diff <= 53) {
        age_groups["42-53"] += 1;
      } else if (diff >= 54 && diff <= 65) {
        age_groups["54-65"] += 1;
      } else if (diff > 65) {
        age_groups["65~"] += 1;
      }
    }
    util.setSuccess(200, "Chart Data Retrieved", {
      gender_chart: gender_chart,
      age_chart: age_groups,
    });
    return util.send(res);
  }

  static async countUserTypes(req, res) {
    let vendors = await db.User.count({ where: { RoleId: 4 } });
    let beneficiaries = await db.User.count({ where: { RoleId: 5 } });
    util.setSuccess(200, "Users Type Counted", { vendors, beneficiaries });
    return util.send(res);
  }

  static async getTotalAmountRecieved(req, res) {
    let id = req.params.id;
    await db.User.findOne({
      where: { id: req.params.id },
      include: { model: db.Wallet, as: "Wallet" },
    }).then(async (user) => {
      await db.Transaction.findAll({
        where: { walletRecieverId: user.Wallet.uuid },
        attributes: [
          [sequelize.fn("sum", sequelize.col("amount")), "amount_recieved"],
        ],
      }).then(async (transactions) => {
        util.setSuccess(200, "Recieved Transactions", { transactions });
        return util.send(res);
      });
    });
  }

  static async getWalletBalance(req, res) {
    const user_id = req.params.id;
    const userExist = await db.User.findOne({
      where: { id: user_id },
      include: ["Wallet"],
    })
      .then((user) => {
        util.setSuccess(200, "User Wallet Balance", user.Wallet);
        return util.send(res);
      })
      .catch((err) => {
        util.setError(404, "Invalid User Id");
        return util.send(res);
      });
  }

  static async addToCart(req, res) {
    let data = req.body;
    let rules = {
      userId: "required|numeric",
      productId: "required|numeric",
      quantity: "required|numeric",
    };
    let validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(400, validation.errors);
      return util.send(res);
    } else {
      let user = await db.User.findByPk(data.userId);
      if (!user) {
        util.setError(404, "Invalid User");
        return util.send(res);
      }
      let product = await db.Products.findOne({
        where: { id: data.productId },
        include: { model: db.Market, as: "Vendor" },
      });
      if (!product) {
        util.setError(404, "Invalid Product");
        return util.send(res);
      }
      let pendingOrder = await db.Order.findOne({
        where: { UserId: data.userId, status: "pending" },
        include: {
          model: db.OrderProducts,
          as: "Cart",
          order: [["createdAt", "DESC"]],
          include: { model: db.Products, as: "Product" },
        },
      });

      if (!pendingOrder) {
        let uniqueId = String(
          Math.random().toString(36).substring(2, 12)
        ).toUpperCase();
        await user
          .createOrder({ OrderUniqueId: uniqueId })
          .then(async (order) => {
            await order
              .createCart({
                ProductId: product.id,
                unit_price: product.price,
                quantity: data.quantity,
                total_amount: product.price * data.quantity,
              })
              .then((cart) => {
                util.setSuccess(201, product.name + " has been added to cart");
                return util.send(res);
              });
          });
      } else {
        if (pendingOrder.Cart.length) {
          if (pendingOrder.Cart[0].Product.MarketId != product.MarketId) {
            util.setError(
              400,
              "Cannot add product that belongs to a different vendor"
            );
            return util.send(res);
          } else {
            let productAddedToCart = await db.OrderProducts.findOne({
              where: { ProductId: product.id },
            });
            if (productAddedToCart) {
              await productAddedToCart
                .update({
                  quantity: data.quantity,
                  total_amount: data.quantity * product.price,
                  unit_price: product.price,
                })
                .then(() => {
                  util.setSuccess(
                    201,
                    product.name + " has been added to cart"
                  );
                  return util.send(res);
                });
            } else {
              await pendingOrder
                .createCart({
                  ProductId: product.id,
                  quantity: data.quantity,
                  total_amount: data.quantity * product.price,
                  unit_price: product.price,
                })
                .then(() => {
                  util.setSuccess(
                    201,
                    product.name + " has been added to cart"
                  );
                  return util.send(res);
                });
            }
          }
        } else {
          await pendingOrder
            .createCart({
              ProductId: product.id,
              quantity: data.quantity,
              total_amount: data.quantity * product.price,
              unit_price: product.price,
            })
            .then(() => {
              util.setSuccess(201, product.name + " has been added to cart");
              return util.send(res);
            });
        }
      }
    }
  }

  static async getCart(req, res) {
    let id = req.params.userId;
    let user = await db.User.findByPk(id);
    if (!user) {
      util.setError(404, "Invalid User");
      return util.send(res);
    }
    let pendingOrder = await db.Order.findOne({
      where: { UserId: id, status: "pending" },
      include: {
        model: db.OrderProducts,
        as: "Cart",
        attributes: { exclude: ["OrderId"] },
      },
    });

    if (pendingOrder && pendingOrder.Cart.length) {
      util.setSuccess(200, "Cart", { cart: pendingOrder.Cart });
      return util.send(res);
    } else {
      util.setError(400, "No Item in Cart");
      return util.send(res);
    }
  }

  static async updatePin(req, res) {
    let data = req.body;
    let rules = {
      userId: "required|numeric",
      pin: "required|numeric",
    };
    let validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      let user = await db.User.findByPk(data.userId);
      if (!user) {
        util.setError(404, "Invalid User");
        return util.send(res);
      } else {
        await user.update({ pin: data.pin }).then(() => {
          util.setSuccess(200, "Pin updated Successfully");
          return util.send(res);
        });
      }
    }
  }

  static async getSummary(req, res) {
    const id = req.params.id;
    const users = await db.User.findOne({
      where: { id: req.params.id },
      include: { model: db.Wallet, as: "Wallet" },
    }).then(async (user) => {
      const spent = await db.Transaction.sum("amount", {
        where: { walletSenderId: user.Wallet.uuid },
      });
      const recieved = await db.Transaction.sum("amount", {
        where: { walletRecieverId: user.Wallet.uuid },
      });
      util.setSuccess(200, "Summary", {
        balance: user.Wallet.balance,
        recieved,
        spent,
      });
      return util.send(res);
    });
  }

  static async checkOut(req, res) {
    let data = req.body;

    let rules = {
      userId: "required|numeric",
      pin: "required|numeric",
      campaign: "required|numeric",
    };

    let validation = new Validator(data, rules);

    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      let campaign = await db.Campaign.findByPk(data.campaign);

      if (!campaign) {
        util.setError(404, "Invalid Campaign Id");
        return util.send(res);
      }

      let user = await db.User.findOne({
        where: { id: data.userId },
        include: {
          model: db.Wallet,
          as: "Wallet",
          where: { CampaignId: data.campaign },
        },
      });

      if (!user) {
        util.setError(404, "Invalid User");
        return util.send(res);
      }

      if (user.pin != data.pin) {
        util.setError(400, "Invalid Pin");
        return util.send(res);
      }

      let pendingOrder = await db.Order.findOne({
        where: { UserId: data.userId, status: "pending" },
        include: {
          model: db.OrderProducts,
          as: "Cart",
          include: {
            model: db.Products,
            as: "Product",
            include: { model: db.Market, as: "Vendor" },
          },
        },
      });

      console.log(pendingOrder);

      if (pendingOrder && pendingOrder.Cart.length) {
        let sum = pendingOrder.Cart.reduce((a, b) => {
          return Number(a) + Number(b.total_amount);
        }, 0);
        if (user.Wallet[0].balance < sum) {
          util.setError(
            400,
            "Insufficient Funds in Wallet to clear Cart Items"
          );
          return util.send(res);
        } else {
          try {
            let result = await db.sequelize.transaction(async (t) => {
              let vendor = await db.Wallet.findOne({
                where: {
                  AccountUserId: pendingOrder.Cart[0].Product.Vendor.UserId,
                  AccountUserType: "user",
                  CampaignId: null,
                },
              });

              let buyer = await db.Wallet.findOne({
                where: {
                  AccountUserId: data.userId,
                  AccountUserType: "user",
                  CampaignId: data.campaign,
                },
              });

              let ngo = await db.Wallet.findOne({
                where: {
                  AccountUserType: "organisation",
                  CampaignId: data.campaign,
                },
              });

              await pendingOrder
                .createTransaction({
                  walletSenderId: buyer.uuid,
                  walletRecieverId: vendor.uuid,
                  amount: sum,
                  status: "processing",
                  is_approved: false,
                  narration: "Payment for Order " + pendingOrder.OrderUniqueId,
                })
                .then(async (transaction) => {
                  const transferFromQueuemessage = {
                    ownerAddress: ngo.address,
                    recieverAddress: vendor.address,
                    spenderAddress: buyer.address,
                    senderKey: buyer.privateKey,
                    amount: sum,
                    transactionId: transaction.uuid,
                    pendingOrder: pendingOrder.id,
                  };
                  transferFromQueue.send(
                    new Message(transferFromQueuemessage, {
                      contentType: "application/json",
                    })
                  );
                  util.setSuccess(200, "Transfer Initiated");
                  return util.send(res);
                });
            });
          } catch (error) {
            util.setError(500, error.message);
            return util.send(res);
          }
        }
      } else {
        util.setError(400, "No Item in Cart");
        return util.send(res);
      }
    }
  }
}
function getDifference(dob) {
  today = new Date();
  past = new Date(dob); // remember this is equivalent to 06 01 2010
  //dates in js are counted from 0, so 05 is june
  var diff = Math.floor(today.getTime() - dob.getTime());
  var day = 1000 * 60 * 60 * 24;

  var days = Math.floor(diff / day);
  var months = Math.floor(days / 31);
  var years = Math.floor(months / 12);

  return years;
}

module.exports = UsersController;
