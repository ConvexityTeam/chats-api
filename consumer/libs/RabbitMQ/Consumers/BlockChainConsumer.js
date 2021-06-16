"use strict";
var _a;
exports.__esModule = true;
var amqp_1 = require("./../Connection");
const { Op } = require("sequelize");

const db = require("./../../../models");
const {
  createAccountWallet,
  mintToken,
  approveToSpend,
  transferFrom,
  transferTo,
} = require("./../../../services/Blockchain");

const { createPair } = require("../../../services/Bantu");
const ninVerification = require("../../../services/NinController");

var createWalletQueue = amqp_1["default"].declareQueue("createWallet", {
  durable: true,
  prefetch: 1,
});

var mintTokenQueue = amqp_1["default"].declareQueue("mintToken", {
  durable: true,
  prefetch: 1,
});

var approveToSpendQueue = amqp_1["default"].declareQueue("approveToSpend", {
  durable: true,
  prefetch: 1,
});

var transferFromQueue = amqp_1["default"].declareQueue("transferFrom", {
  durable: true,
  prefetch: 1,
});

var transferToQueue = amqp_1["default"].declareQueue("transferTo", {
  durable: true,
  prefetch: 1,
});

var ninVerificationQueue = amqp_1["default"].declareQueue("nin_verification", {
  durable: true,
  prefetch: 1,
});

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    createWalletQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const type = content.type;
        const campaign = content.campaign ? content.campaign : null;
        let user;
        if (type === "organisation") {
          user = await db.Organisations.findByPk(content.id);
        } else if (type === "user") {
          user = await db.User.findByPk(content.id);
        }
        createAccountWallet()
          .then(async (response) => {
            const address = response.AccountCreated.address;
            const privateKey = response.AccountCreated.privateKey;
            let walletRow;
            if (type === "organisation") {
              const existingWallet = await user.getWallet();
              if (existingWallet.length) {
                walletRow = {
                  address,
                  privateKey,
                  CampaignId: campaign,
                };
              } else {
                const bantuPair = createPair();
                walletRow = {
                  address,
                  privateKey,
                  CampaignId: campaign,
                  bantuAddress: bantuPair.publicKey,
                  bantuPrivateKey: bantuPair.secret,
                };
              }
            } else {
              walletRow = {
                address,
                privateKey,
                CampaignId: campaign,
              };
            }

            const wallet = await user.createWallet(walletRow);
            msg.ack();
          })
          .catch((err) => {
            console.log("Here2");
            console.log(err);
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Create Wallet");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    mintTokenQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const address = content.address;
        const amount = content.amount;
        const fundTransaction = content.fund;
        mintToken(address, amount).then(async () => {
          await db.Organisations.findOne({
            where: { id: content.id },
            include: {
              model: db.Wallet,
              as: "Wallet",
              where: {
                bantuAddress: {
                  [Op.ne]: null,
                },
              },
            },
          })
            .then(async (org) => {
              await org.Wallet[0]
                .increment("balance", { by: amount })
                .then(async () => {
                  await db.FundAccount.findByPk(fundTransaction).then(
                    (record) => {
                      record.status = "successful";
                      record.save();
                    }
                  );
                });
              console.log("Done");
              msg.ack();
            })
            .catch((error) => {
              console.log("An Error Occurred", error.message);
              msg.nack();
            });
        });
      })
      .then(function () {
        return console.log("Running consumer for Mint Token");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    approveToSpendQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const ngoAddr = content.ngoAddress;
        const ngoPassword = content.ngoPrivateKey;
        const reciever = content.reciever;
        const amount = content.amount;
        const transactionUuid = content.transactionId;

        approveToSpend(ngoAddr, ngoPassword, reciever, amount)
          .then(async (response) => {
            const transaction = await db.Transaction.findOne({
              where: { uuid: transactionUuid },
            });
            await transaction
              .update({
                status: "success",
                transactionHash: response.Approved.TransactionHash,
              })
              .then(async (transaction) => {
                const sender = await db.Wallet.findOne({
                  where: { address: ngoAddr },
                });
                const recieverAdd = await db.Wallet.findOne({
                  where: { address: reciever },
                });
                await sender.decrement("balance", { by: amount }).catch(() => {
                  console.log("Could not deduct");
                });
                await recieverAdd
                  .increment("balance", { by: amount })
                  .catch(() => {
                    console.log("Could not increment");
                  });
              })
              .catch(() => {
                console.log("Could not find transaction");
              });
            msg.ack();
          })
          .catch(async (err) => {
            const transaction = await db.Transaction.findOne({
              where: { uuid: transactionUuid },
            });
            await transaction.update({ status: "declined" });
            msg.ack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Approve to Spend");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    transferFromQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const owner = content.ownerAddress;
        const reciever = content.recieverAddress;
        const spender = content.spenderAddress;
        const spenderKey = content.senderKey;
        const amount = Math.ceil(content.amount);
        const transactionId = content.transactionId;
        const pendingOrder = content.pendingOrder;
        const order = await db.Order.findOne({
          where: { id: pendingOrder },
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

        transferFrom(owner, spender, spenderKey, reciever, amount)
          .then(async (response) => {
            const gottenResponse = response.TransferedFrom;
            const beneficiaryWallet = await db.Wallet.findOne({
              where: { address: spender },
            });
            const vendorWallet = await db.Wallet.findOne({
              where: { address: gottenResponse.Receiver },
            });
            const order = await db.Order.findOne({
              where: { id: pendingOrder },
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
            const transactionRecord = await db.Transaction.findByPk(
              transactionId
            );

            await beneficiaryWallet
              .decrement("balance", {
                by: gottenResponse.Amount,
              })
              .then(async () => {
                await vendorWallet
                  .increment("balance", {
                    by: gottenResponse.Amount,
                  })
                  .then(async () => {
                    await order
                      .update({ status: "confirmed" })
                      .then(async () => {
                        await transactionRecord.update({
                          status: "success",
                          is_approved: true,
                          transactionHash: gottenResponse.TransactionHash,
                        });

                        for (let cart of order.Cart) {
                          await cart.Product.decrement("quantity", {
                            by: cart.quantity,
                          });
                        }
                        msg.ack();
                      });
                  });
              });
          })
          .catch((error) => {
            console.log(error);
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Transfer From");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    transferToQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        const amount = content.amount;
        const senderPass = content.senderPass;
        const senderAddress = content.senderAddress;
        const reciepientAddress = content.reciepientAddress;
        const transaction = content.transaction;

        transferTo(senderAddress, senderPass, reciepientAddress, amount)
          .then(async (response) => {
            console.log(response);
            const transactionExist = await db.Transaction.findByPk(transaction);
            const sender = await db.Wallet.findOne({
              where: { address: senderAddress },
            });
            const reciever = await db.Wallet.findOne({
              where: { address: reciepientAddress },
            });
            sender.decrement("balance", {
              by: amount,
            });
            reciever.increment("balance", {
              by: amount,
            });
            transactionExist.status = "success";
            transactionExist.transactionHash =
              response.Transfered.TransactionHash;
            transactionExist.save();
            msg.ack();
          })
          .catch((err) => {
            console.log(err);
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer for Transfer To");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    ninVerificationQueue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        let user = await db.User.findByPk(content.id);

        ninVerification(user)
          .then(async (response) => {
            if (response.message === "norecord") {
              await user.update({ status: "suspended" });
              msg.ack();
            }
            if (response.message === "Success") {
              let data = response.demoData[0];
              let names = [
                String(data.firstname).toLowerCase(),
                String(data.surname).toLowerCase(),
              ];
              if (
                names.includes(String(user.first_name).toLowerCase()) &&
                names.includes(String(user.last_name).toLowerCase())
              ) {
                await user.update({ status: "activated" });
                console.log("User Activated");
              } else {
                await user.update({ status: "suspended" });
              }
              msg.ack();
              console.log("Concluded");
            }
          })
          .catch((error) => {
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running Nin Verification Queue");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });
