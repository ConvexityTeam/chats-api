const OrganisationsService = require("../services/OrganisationsService");
const db = require("../models");
const { Op } = require("sequelize");
const UserService = require("../services/UserService");
const util = require("../libs/Utils");
const Validator = require("validatorjs");
const formidable = require("formidable");
const fs = require("fs");
const uploadFile = require("./AmazonController");
var amqp_1 = require("./../libs/RabbitMQ/Connection");
const { Message } = require("@droidsolutions-oss/amqp-ts");
const { transferToken } = require("../services/Bantu");
const api = require("../libs/Axios");
var createWalletQueue = amqp_1["default"].declareQueue("createWallet", {
  durable: true,
});
var transferToQueue = amqp_1["default"].declareQueue("transferTo", {
  durable: true,
});
var mintTokenQueue = amqp_1["default"].declareQueue("mintToken", {
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
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const organisation = await OrganisationsService.checkExistEmail(
        data.email
      );

      if (organisation) {
        util.setError(422, "Email already taken");
        return util.send(res);
      } else {
        const success = OrganisationsService.addOrganisation(
          data,
          req.user
        ).then((response) => {
          createWalletQueue.send(
            new Message(
              {
                id: req.organisation.id,
                type: "organisation",
              },
              { contentType: "application/json" }
            )
          );
          util.setSuccess(200, "NGO Successfully added");
          return util.send(res);
        });
      }
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
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const organisation = await OrganisationsService.checkExist(
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
        util.setError(422, errors);
        return util.send(res);
      } else {
        const is_member = await OrganisationsService.isMember(
          organisation.id,
          user.id
        );
        if (!is_member) {
          await organisation
            .createMember({ UserId: data.user_id, role: "member" })
            .then(() => {
              util.setSuccess(201, "User Added to NGO successfully.");
              return util.send(res);
            });
        } else {
          util.setError(422, "User is already a member");
          return util.send(res);
        }
      }
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
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: { id: data.campaignId },
      });

      if (!campaignExist) {
        util.setError(400, "Invalid Campaign Id");
        return util.send(res);
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

      const updateCampaign = await campaignExist.update(campaignData);

      util.setSuccess(201, "Campaign Data updated");
      return util.send(res);
    }
  }

  static async fetchTransactions(req, res) {
    try {
      const organisationId = req.params.organisationId;

      const organisationExist = await db.Organisations.findOne({
        where: { id: organisationId },
        include: { as: "Transaction", model: db.Transaction },
      });

      const mintTransactions = await db.FundAccount.findAll({
        where: { OrganisationId: organisationId },
      });

      util.setSuccess(201, "Transactions", {
        transaction: organisationExist.Transaction,
        mintTransaction: mintTransactions,
      });

      return util.send(res);
    } catch (error) {
      console.log(error.message);
      util.setSuccess(201, "Invalid Organisation Id");
      return util.send(res);
    }
  }

  static async createCampaign(req, res) {
    try {
      const data = req.body;
      data["today"] = new Date(Date.now()).toDateString();
      const rules = {
        organisation_id: "required|numeric",
        type: "required|string|in:campaign,cash-for-work",
        title: "required|string",
        budget: "required|numeric",
        location: "required|string",
        description: "required|string",
        start_date: "required|date|after_or_equal:today",
        end_date: "required|date|after_or_equal:start_date",
        spending: "in:vendor,all",
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        util.setError(422, validation.errors);
        return util.send(res);
      } else {
        const campaignExist = await db.Campaign.findOne({
          where: { title: data.title },
        });
        if (campaignExist) {
          util.setError(400, "A campaign with the same title already exist");
          return util.send(res);
        } else {
          const campaign = {
            type: data.type,
            title: data.title,
            budget: data.budget,
            location: data.location,
            description: data.description,
            start_date: data.start_date,
            end_date: data.end_date,
            spending:
              data.type == "cash-for-work"
                ? "all"
                : data.spending != ""
                ? data.spending
                : "alls",
          };
          await req.member.createCampaign(campaign).then((response) => {
            createWalletQueue.send(
              new Message(
                {
                  id: req.organisation.id,
                  campaign: response.id,
                  type: "organisation",
                },
                { contentType: "application/json" }
              )
            );
            util.setSuccess(201, "New Campaign successfully created");
            return util.send(res);
          });
        }
      }
    } catch (error) {
      util.setError(500, "An error Occured");
      return util.send(res);
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
          util.setError(400, validation.errors);
          return util.send(res);
        } else {
          const url_string = fields.website_url;
          const domain = extractDomain(url_string);
          const email = fields.email;
          const re = "(\\W|^)[\\w.\\-]{0,25}@" + domain + "(\\W|$)";
          if (!email.match(new RegExp(re))) {
            util.setError(400, "Email must end in @" + domain);
            return util.send(res);
          }

          if (files.logo) {
            const allowed_types = ["image/jpeg", "image/png", "image/jpg"];
            if (!allowed_types.includes(files.logo.type)) {
              util.setError(
                400,
                "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture"
              );
              return util.send(res);
            }
          }
          const organisation_exist = await db.Organisations.findOne({
            where: { email: fields.email },
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
                    org.update({ logo_link: url });
                  });
                }
                await db.User.findByPk(req.user.id).then((user) => {
                  user
                    .update({
                      first_name: fields.first_name,
                      last_name: fields.last_name,
                    })
                    .then((response) => {
                      util.setSuccess(201, "NGO profile updated successfully", {
                        org,
                      });
                      return util.send(res);
                    });
                });
              });
          } else {
            util.setError(400, "Email has been taken by another organisation");
            return util.send(res);
          }
        }
      });
    } catch (error) {
      util.setError(500, "An error Occured");
      return util.send(res);
    }
  }

  static async mintToken2(req, res) {
    const data = req.body;
    fs.writeFile("sample.txt", JSON.stringify(data), function (err) {
      if (err) {
        return res.json({ status: "Error" });
      }
      return res.json({ status: "DOne" });
    });
  }

  static async getFinancials(req, res) {
    try {
      const id = req.params.id;
      let ngo = await db.Organisations.findOne({
        where: { id },
        include: {
          model: db.Wallet,
          as: "Wallet",
        },
      });
      const recieved = await db.Transaction.sum("amount", {
        where: { walletRecieverId: ngo.Wallet.uuid },
      });
      const sent = await db.Transaction.sum("amount", {
        where: { walletSenderId: ngo.Wallet.uuid },
      });
      util.setSuccess(200, "Organisation Financials Retrieved", {
        balance: ngo.Wallet.balance,
        recieved,
        disbursed: sent,
      });
      return util.send(res);
    } catch (error) {
      util.setError(200, "Id is invalid");
      return util.send(res);
    }
  }

  static async getMetric(req, res) {
    const id = req.params.id;
    const organisation = await db.Organisations.findOne({
      where: { id },
      include: ["Wallet"],
    });
    const maxDisbursement = await db.Transaction.findAll({
      where: {},
      attributes: [
        "createdAt",
        [sequelize.fn("sum", sequelize.col("amount")), "total_amount"],
      ],
      group: ["member_id"],
    });
  }

  static async bantuTransfer(req, res) {
    const data = req.body;
    const rules = {
      organisation_id: "required|numeric",
      xbnAmount: "required|numeric",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(400, validation.errors);
      return util.send(res);
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
        await transferToken(
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
                  new Message(messageBody, { contentType: "application/json" })
                );
                util.setSuccess(200, "Token Minting Initiated");
                return util.send(res);
              });
          })
          .catch((error) => {
            util.setError(400, error);
            return util.send(res);
          });
      } else {
        util.setError(400, "Invalid Organisation / Campaign");
        return util.send(res);
      }
    }
  }

  static async mintToken(req, res) {
    const data = req.body;
    const txRef = data.id;

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    const response = await api.get(
      `https://api.flutterwave.com/v3/transactions/${txRef}/verify`,
      {
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
      where: { transactionReference: txRef },
    });
    if (reference) {
      util.setError(400, "Transaction Reference already exist");
      return util.send(res);
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
            new Message(messageBody, { contentType: "application/json" })
          );
          util.setSuccess(200, "Mint Action Initiated");
          return util.send(res);
        });
    } else {
      util.setError(400, "Invalid Organisation Id");
      return util.send(res);
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
          attributes: { exclude: ["bantuPrivateKey", "privateKey"] },
        },
      });
      util.setSuccess(200, "Organisation Wallet Retrieved", {
        wallets: organisation.Wallet,
      });
      return util.send(res);
    } catch (error) {
      util.setError(400, "Invalid Organisation Id");
      return util.send(res);
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
          attributes: { exclude: ["bantuPrivateKey", "privateKey"] },
          where: {
            bantuAddress: {
              [Op.ne]: null,
            },
          },
        },
      });
      util.setSuccess(200, "Organisation Wallet Retrieved", {
        wallet: organisation.Wallet[0],
      });
      return util.send(res);
    } catch (error) {
      util.setError(400, "Invalid Organisation Id");
      return util.send(res);
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
          attributes: { exclude: ["bantuPrivateKey", "privateKey"] },
          where: {
            CampaignId: campaign,
          },
        },
      });
      util.setSuccess(200, "Organisation Wallet Retrieved", {
        wallet: organisation.Wallet[0],
      });
      return util.send(res);
    } catch (error) {
      util.setError(400, "Invalid Organisation /Campaign Id");
      return util.send(res);
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
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const organisation = await db.Organisations.findOne({
        where: { id: data.organisation_id },
        include: {
          model: db.Wallet,
          as: "Wallet",
        },
      });

      if (!organisation) {
        util.setError(400, "Invalid Organisation Id");
        return util.send(res);
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
        util.setError(
          400,
          "Organisation does not have a wallet attached to this campaign"
        );
        return util.send(res);
      }

      const campaign = await db.Campaign.findByPk(data.campaign);

      if (mainWallet.balance < data.amount) {
        util.setError(400, "Main Wallet Balance has Insufficient Balance");
        return util.send(res);
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
              new Message(
                {
                  senderAddress: mainWallet.address,
                  senderPass: mainWallet.privateKey,
                  reciepientAddress: reciepientWallet.address,
                  amount: data.amount,
                  transaction: transaction.uuid,
                },
                { contentType: "application/json" }
              )
            );
          });
        util.setSuccess(200, "Transfer has been Initiated");
        return util.send(res);
      }
    }
  }

  static async getBeneficiariesFinancials(req, res) {
    // try {
    const id = req.params.id;
    let ngo = await db.Organisations.findOne({
      where: { id },
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
      util.setSuccess(200, "Beneficiaries", { spent, recieved, remaining });
      return util.send(res);
    }
    // } catch (error) {
    // util.setError(200, "Id is invalid");
    // return util.send(res);
    // }
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
