const {
  Op
} = require("sequelize");
const {
  OrganisationService,
  VendorService
} = require('../services');
const {
  HttpStatusCode,
  SanitizeObject
} = require('../utils');
const UserService = require("../services/UserService");
const {
  Response
} = require("../libs");
const db = require("../models");

const Validator = require("validatorjs");
const formidable = require("formidable");
const fs = require("fs");
const uploadFile = require("./AmazonController");

const amqp = require("./../libs/RabbitMQ/Connection");

const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const BantuService = require("../services");
const api = require("../libs/Axios");
const {
  CampaignService,
  QueueService
} = require("../services");

const createWalletQueue = amqp["default"].declareQueue("createWallet", {
  durable: true,
});
const transferToQueue = amqp["default"].declareQueue("transferTo", {
  durable: true,
});
const mintTokenQueue = amqp["default"].declareQueue("mintToken", {
  durable: true,
});

class OrganisationController {
  static async register(req, res) {
    const data = req.body;
    const rules = {
      name: "required|string",
      email: "required|email",
      phone: "required|string",
      address: "required|string",
      location: "required|string",
      logo_link: "url",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await OrganisationService.checkExistEmail(
        data.email
      );

      if (organisation) {
        Response.setError(422, "Email already taken");
        return Response.send(res);
      } else {}
    }
  }

  static async getAvailableOrgCampaigns(req, res) {
    try {
      const OrganisationId = req.params.organisation_id;
      const {
        type
      } = SanitizeObject(req.query);
      const query = {
        ...(type && {
          type
        }),
        status: 'active'
      }
      const campaigns = await CampaignService.getCampaigns({
        ...query,
        OrganisationId
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', campaigns);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }
  }

  static async getAllOrgCampaigns(req, res) {
    try {
      const OrganisationId = req.params.organisation_id;
      const query = SanitizeObject(req.query);
      const campaigns = await CampaignService.getCampaigns({
        ...query,
        OrganisationId
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'All Campaigns.', campaigns);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }
  }

  static async getBeneficiariesTransactions(req, res) {
    try {
      const transactions = await OrganisationService.beneficiariesTransactions(req.organisation.id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiaries transactions.', transactions);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }
  }

  static async addMember(req, res) {
    const data = req.body;
    const rules = {
      user_id: "required|numeric",
      organisation_id: "required|numeric",
      role: "required|string|in:admin,member",
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await OrganisationService.checkExist(
        data.organisation_id
      );
      const user = await UserService.getAUser(data.user_id);
      var errors = [];
      if (!organisation) {
        errors.push("Organisation is Invalid");
      }
      if (!user) {
        errors.push("User is Invalid");
      }
      if (errors.length) {
        Response.setError(422, errors);
        return Response.send(res);
      } else {
        const is_member = await OrganisationService.isMember(
          organisation.id,
          user.id
        );
        if (!is_member) {
          await organisation
            .createMember({
              UserId: data.user_id,
              role: "member"
            })
            .then(() => {
              Response.setSuccess(201, "User Added to NGO successfully.");
              return Response.send(res);
            });
        } else {
          Response.setError(422, "User is already a member");
          return Response.send(res);
        }
      }
    }
  }

  static async updateOrgCampaign(req, res) {
    try {
      let id = req.params.campaign_id;

      const data = SanitizeObject(req.body, ['title', 'description', 'budget', 'location', 'start_date', 'end_date', 'status']);

      // TODO: Check title conflict

      // Handle update here
      await CampaignService.updateSingleCampaign(id, data);
      const campaign = await CampaignService.getCampaignById(id);

      Response.setSuccess(HttpStatusCode.STATUS_OK, "Campaign updated.", campaign);
      return Response.send(res);
    } catch (error) {
      console.log({
        error
      });
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, "Campaign update failed. Please retry.");
      return Response.send(res);
    }
  }

  static async updateCampaign(req, res) {
    const data = req.body;
    const rules = {
      campaignId: "required|numeric",
      budget: "required|numeric",
      description: "required|string",
      spending: "in:vendor,all",
      status: "in:pending,in-progress,deleted,paused",
      organisation_id: "required|numeric",
    };

    const validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: {
          id: data.campaignId
        },
      });

      if (!campaignExist) {
        Response.setError(400, "Invalid Campaign Id");
        return Response.send(res);
      }

      const campaignData = {
        budget: data.budget,
        description: data.description,
      };

      if (data.status) {
        campaignData["status"] = data.status;
      }

      if (data.spending) {
        campaignData["spending"] = data.spending;
      }


      Response.setSuccess(201, "Campaign Data updated");
      return Response.send(res);
    }
  }

  static async fetchTransactions(req, res) {
    try {
      const organisationId = req.params.organisationId;

      const organisationExist = await db.Organisations.findOne({
        where: {
          id: organisationId
        },
        include: {
          as: "Transaction",
          model: db.Transaction
        },
      });

      const mintTransactions = await db.FundAccount.findAll({
        where: {
          OrganisationId: organisationId
        },
      });

      Response.setSuccess(201, "Transactions", {
        transaction: organisationExist.Transaction,
        mintTransaction: mintTransactions,
      });

      return Response.send(res);
    } catch (error) {
      console.log(error.message);
      Response.setSuccess(201, "Invalid Organisation Id");
      return Response.send(res);
    }
  }

  static async createCampaign(req, res) {
    try {
      const data = SanitizeObject(req.body);
      const spending = data.type == 'campaign' ? 'vendor' : 'all';
      const OrganisationId = req.organisation.id;

      CampaignService.addCampaign({ ...data, spending, OrganisationId, status: 'pending' }) .then(campaign => {
          QueueService.createWallet(OrganisationId, 'organisation', campaign.id);
          Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Created Campaign.', campaign);
          return Response.send(res);
        })
        .catch(err => {
          throw err;
        })
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, "Campaign creation fail. Please retry.");
      return Response.send(res);
    }
  }
  static async updateProfile(req, res) {
    try {
      var form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        const rules = {
          organisation_id: "required|numeric",
          first_name: "required|alpha",
          last_name: "required|alpha",
          email: "required|email",
          phone: "required|string",
          address: "required|string",
          state: "required|string",
          country: "required|string",
          registration_id: "required|string",
          year: "required",
          website_url: "url",
        };
        const validation = new Validator(fields, rules, {
          url: "Only valid url with https or http allowed",
        });
        if (validation.fails()) {
          Response.setError(400, validation.errors);
          return Response.send(res);
        } else {
          const url_string = fields.website_url;
          const domain = extractDomain(url_string);
          const email = fields.email;
          const re = "(\\W|^)[\\w.\\-]{0,25}@" + domain + "(\\W|$)";
          if (!email.match(new RegExp(re))) {
            Response.setError(400, "Email must end in @" + domain);
            return Response.send(res);
          }

          if (files.logo) {
            const allowed_types = ["image/jpeg", "image/png", "image/jpg"];
            if (!allowed_types.includes(files.logo.type)) {
              Response.setError(
                400,
                "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture"
              );
              return Response.send(res);
            }
          }
          const organisation_exist = await db.Organisations.findOne({
            where: {
              email: fields.email
            },
          });
          if (
            !organisation_exist ||
            organisation_exist |
            (organisation_exist.id == fields.organisation_id)
          ) {
            if (!organisation_exist) {
              var org = await db.Organisations.findByPk(fields.organisation_id);
            } else {
              var org = organisation_exist;
            }
            org
              .update({
                email: fields.email,
                phone: fields.phone,
                address: fields.address,
                state: fields.state,
                country: fields.country,
                registration_id: fields.registration_id,
                year_of_inception: fields.year,
                website_url: fields.website_url,
              })
              .then(async () => {
                if (files.logo) {
                  await uploadFile(
                    files.logo,
                    "ngo-l-" + org.id,
                    "convexity-ngo-logo"
                  ).then((url) => {
                    org.update({
                      logo_link: url
                    });
                  });
                }
                await db.User.findByPk(req.user.id).then((user) => {
                  user
                    .update({
                      first_name: fields.first_name,
                      last_name: fields.last_name,
                    })
                    .then(() => {
                      Response.setSuccess(201, "NGO profile updated successfully", {
                        org,
                      });
                      return Response.send(res);
                    });
                });
              });
          } else {
            Response.setError(400, "Email has been taken by another organisation");
            return Response.send(res);
          }
        }
      });
    } catch (error) {
      Response.setError(500, "An error Occured");
      return Response.send(res);
    }
  }

  static async mintToken2(req, res) {
    const data = req.body;
    fs.writeFile("sample.txt", JSON.stringify(data), function (err) {
      if (err) {
        return res.json({
          status: "Error"
        });
      }
      return res.json({
        status: "DOne"
      });
    });
  }

  static async getFinancials(req, res) {
    try {
      const id = req.params.id;
      let ngo = await db.Organisations.findOne({
        where: {
          id
        },
        include: {
          model: db.Wallet,
          as: "Wallet",
        },
      });
      const recieved = await db.Transaction.sum("amount", {
        where: {
          walletRecieverId: ngo.Wallet.uuid
        },
      });
      const sent = await db.Transaction.sum("amount", {
        where: {
          walletSenderId: ngo.Wallet.uuid
        },
      });
      Response.setSuccess(200, "Organisation Financials Retrieved", {
        balance: ngo.Wallet.balance,
        recieved,
        disbursed: sent,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(200, "Id is invalid");
      return Response.send(res);
    }
  }

  static async getMetric(req) {
    const id = req.params.id;
  }

  static async bantuTransfer(req, res) {
    const data = req.body;
    const rules = {
      organisation_id: "required|numeric",
      xbnAmount: "required|numeric",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await db.Organisations.findOne({
        where: {
          id: data.organisation_id,
        },
        include: {
          model: db.Wallet,
          as: "Wallet",
          where: {
            bantuAddress: {
              [Op.ne]: null,
            },
          },
        },
      });

      if (organisation) {
        await BantuService.transferToken(
            organisation.Wallet[0].bantuPrivateKey,
            data.xbnAmount
          )
          .then(async (response) => {
            await organisation
              .createMintTransaction({
                amount: data.xbnAmount,
                transactionReference: response.hash,
                channel: "bantu",
              })
              .then((fundTransaction) => {
                const messageBody = {
                  id: organisation.id,
                  fund: fundTransaction.id,
                  address: organisation.Wallet[0].address,
                  walletId: organisation.Wallet[0].uuid,
                  amount: data.xbnAmount,
                };
                mintTokenQueue.send(
                  new Message(messageBody, {
                    contentType: "application/json"
                  })
                );
                Response.setSuccess(200, "Token Minting Initiated");
                return Response.send(res);
              });
          })
          .catch((error) => {
            Response.setError(400, error);
            return Response.send(res);
          });
      } else {
        Response.setError(400, "Invalid Organisation / Campaign");
        return Response.send(res);
      }
    }
  }

  static async mintToken(req, res) {
    const data = req.body;
    const txRef = data.id;

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    const response = await api.get(
      `https://api.flutterwave.com/v3/transactions/${txRef}/verify`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const organisationId = response.data.data.meta.orgId;
    const amount = response.data.data.amount;

    const organisation = await db.Organisations.findOne({
      where: {
        id: organisationId,
      },
      include: {
        model: db.Wallet,
        as: "Wallet",
        where: {
          bantuAddress: {
            [Op.ne]: null,
          },
        },
      },
    });

    const reference = await db.FundAccount.findOne({
      where: {
        transactionReference: txRef
      },
    });
    if (reference) {
      Response.setError(400, "Transaction Reference already exist");
      return Response.send(res);
    }

    if (organisation) {
      await organisation
        .createMintTransaction({
          amount: amount,
          transactionReference: txRef,
          channel: "bantu",
        })
        .then((fundTransaction) => {
          const messageBody = {
            id: organisation.id,
            fund: fundTransaction.id,
            address: organisation.Wallet[0].address,
            walletId: organisation.Wallet[0].uuid,
            amount: amount,
          };
          mintTokenQueue.send(
            new Message(messageBody, {
              contentType: "application/json"
            })
          );
          Response.setSuccess(200, "Mint Action Initiated");
          return Response.send(res);
        });
    } else {
      Response.setError(400, "Invalid Organisation Id");
      return Response.send(res);
    }
  }

  static async getWallets(req, res) {
    try {
      const id = req.params.organisationId;
      const organisation = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: "Wallet",
          attributes: {
            exclude: ["bantuPrivateKey", "privateKey"]
          },
        },
      });
      Response.setSuccess(200, "Organisation Wallet Retrieved", {
        wallets: organisation.Wallet,
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, "Invalid Organisation Id");
      return Response.send(res);
    }
  }

  static async getMainWallet(req, res) {
    try {
      const id = req.params.organisationId;
      const organisation = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: "Wallet",
          attributes: {
            exclude: ["bantuPrivateKey", "privateKey"]
          },
          where: {
            bantuAddress: {
              [Op.ne]: null,
            },
          },
        },
      });
      Response.setSuccess(200, "Organisation Wallet Retrieved", {
        wallet: organisation.Wallet[0],
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, "Invalid Organisation Id");
      return Response.send(res);
    }
  }

  static async getCampignWallet(req, res) {
    try {
      const id = req.params.organisationId;
      const campaign = req.params.campaignId;
      const organisation = await db.Organisations.findOne({
        where: {
          id,
        },
        include: {
          model: db.Wallet,
          as: "Wallet",
          attributes: {
            exclude: ["bantuPrivateKey", "privateKey"]
          },
          where: {
            CampaignId: campaign,
          },
        },
      });
      Response.setSuccess(200, "Organisation Wallet Retrieved", {
        wallet: organisation.Wallet[0],
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, "Invalid Organisation /Campaign Id");
      return Response.send(res);
    }
  }

  static async transferToken(req, res) {
    const data = req.body;
    const rules = {
      campaign: "required|numeric",
      organisation_id: "required|numeric",
      amount: "required|numeric|min:100",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await db.Organisations.findOne({
        where: {
          id: data.organisation_id
        },
        include: {
          model: db.Wallet,
          as: "Wallet",
        },
      });

      if (!organisation) {
        Response.setError(400, "Invalid Organisation Id");
        return Response.send(res);
      }

      const wallets = organisation.Wallet;
      let mainWallet;
      let reciepientWallet;
      let campaignExist = false;
      wallets.forEach((element) => {
        if (element.CampaignId == data.campaign) {
          campaignExist = true;
          reciepientWallet = element;
        }
        if (element.bantuAddress) {
          mainWallet = element;
        }
      });

      if (!campaignExist) {
        Response.setError(
          400,
          "Organisation does not have a wallet attached to this campaign"
        );
        return Response.send(res);
      }

      const campaign = await db.Campaign.findByPk(data.campaign);

      if (mainWallet.balance < data.amount) {
        Response.setError(400, "Main Wallet Balance has Insufficient Balance");
        return Response.send(res);
      } else {
        await organisation
          .createTransaction({
            walletSenderId: mainWallet.uuid,
            walletRecieverId: reciepientWallet.uuid,
            amount: data.amount,
            narration: "Funding " + campaign.title + " campaign ",
          })
          .then((transaction) => {
            transferToQueue.send(
              new Message({
                senderAddress: mainWallet.address,
                senderPass: mainWallet.privateKey,
                reciepientAddress: reciepientWallet.address,
                amount: data.amount,
                transaction: transaction.uuid,
              }, {
                contentType: "application/json"
              })
            );
          });
        Response.setSuccess(200, "Transfer has been Initiated");
        return Response.send(res);
      }
    }
  }

  static async getBeneficiariesFinancials(req, res) {
    // try {
    const id = req.params.id;
    let ngo = await db.Organisations.findOne({
      where: {
        id
      },
      include: {
        model: db.OrganisationMembers,
        as: "Member",
      },
    });
    if (ngo) {
      const members = ngo["Member"].map((element) => {
        return element.id;
      });
      const campaigns = await db.Campaign.findAll({
        where: {
          OrganisationMemberId: {
            [Op.or]: members,
          },
        },
        include: {
          model: db.Beneficiaries,
          as: "Beneficiaries",
          include: {
            model: db.User,
            as: "User",
            include: {
              model: db.Wallet,
              as: "Wallet",
            },
          },
        },
      });
      const wallets = [];
      let remaining = 0;
      for (let camp of campaigns) {
        for (let beneficiary of camp.Beneficiaries) {
          let wallet = beneficiary.User.Wallet;
          if (!wallets.includes(wallet)) {
            wallets.push(wallet.uuid);
          }
          remaining = remaining + wallet.balance;
        }
      }
      const spent = await db.Transaction.sum("amount", {
        where: {
          walletSenderId: {
            [Op.or]: wallets,
          },
        },
      });
      const recieved = await db.Transaction.sum("amount", {
        where: {
          walletRecieverId: {
            [Op.or]: wallets,
          },
        },
      });
      Response.setSuccess(200, "Beneficiaries", {
        spent,
        recieved,
        remaining
      });
      return Response.send(res);
    }
  }

  static async createVendor(req, res) {
    try {
      const {
        user,
        organisation
      } = req;
      const data = SanitizeObject(req.body, [first_name, last_name, email, phone, address, store_name, location]);
      const vendor = await OrganisationService.createVendorAccount(organisation, data, user);
      Response.setSuccess(201, 'Vendor Account Created.', vendor);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getOrganisationVendors(req, res) {
    try {
      const {
        organisation
      } = req;
      const vendors = (await VendorService.organisationVendors(organisation)).map(res => {
        const toObject = res.toObject();
        toObject.Wallet.map(wallet => {
          delete wallet.privateKey;
          delete wallet.bantuPrivateKey;
          return wallet;
        });
        return toObject;
      });
      Response.setSuccess(200, 'Organisation vendors', vendors);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getVendorDetails(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const vendorId = req.params.vendor_id || req.body.vendor_id;
      const vendor = await VendorService.vendorPublicDetails(vendorId, {
        OrganisationId
      });
      Response.setSuccess(200, 'Organisation vendors', vendor);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getVendorsSummary(req, res) {
    try {
      const organisation = req.organisation;
      const vendors_count = (await VendorService.organisationVendors(organisation)).length;
      const yesterday = new Date((new Date).setDate((new Date).getDate() - 1));
      const previous_stat = await VendorService.organisationDailyVendorStat(organisation.id, yesterday);
      const today_stat = await VendorService.organisationDailyVendorStat(organisation.id);
      const Transactions = await VendorService.organisationIdVendorsTransactions(organisation.id);
      Response.setSuccess(200, 'Organisation vendors Summary', {
        organisation,
        vendors_count,
        previous_stat,
        today_stat,
        Transactions
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }

  }
}

function extractDomain(url) {
  var domain;
  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf("://") > -1) {
    domain = url.split("/")[2];
  } else {
    domain = url.split("/")[0];
  }

  //find & remove www
  if (domain.indexOf("www.") > -1) {
    domain = domain.split("www.")[1];
  }

  domain = domain.split(":")[0]; //find & remove port number
  domain = domain.split("?")[0]; //find & remove url params

  return domain;
}

module.exports = OrganisationController;