// // var _a;
// exports.esModule = true;
// const { Op } = require('sequelize');
// const ampConn = require('./consumers/connection');
// const {
//   Organisation, User, Wallet, FundAccount, Transaction, Order, Market,
// } = require('./models');
// const {
//   createAccountWallet,
//   mintToken,
//   approveToSpend,
//   transferFrom,
//   transferTo,
// } = require('../src/services/BlockchainService');

// const { createPair } = require('../../../services/Bantu');
// const ninVerification = require('../../../services/NinController');

// const createWalletQueue = ampConn.default.declareQueue('createWallet', {
//   durable: true,
//   prefetch: 1,
// });

// const mintTokenQueue = ampConn.default.declareQueue('mintToken', {
//   durable: true,
//   prefetch: 1,
// });

// const approveToSpendQueue = ampConn.default.declareQueue('approveToSpend', {
//   durable: true,
//   prefetch: 1,
// });

// const transferFromQueue = ampConn.default.declareQueue('transferFrom', {
//   durable: true,
//   prefetch: 1,
// });

// const transferToQueue = ampConn.default.declareQueue('transferTo', {
//   durable: true,
//   prefetch: 1,
// });

// const ninVerificationQueue = ampConn.default.declareQueue('nin_verification', {
//   durable: true,
//   prefetch: 1,
// });

// ampConn.default
//   .completeConfiguration()
//   .then(() => {
//     createWalletQueue
//       .activateConsumer(async (msg) => {
//         const content = msg.getContent();
//         const { type } = content;
//         const campaign = content.campaign ? content.campaign : null;
//         let user;
//         if (type === 'organisation') {
//           user = await Organisation.findByPk(content.id);
//         } else if (type === 'user') {
//           user = await User.findByPk(content.id);
//         }
//         createAccountWallet()
//           .then(async (response) => {
//             const { address } = response.AccountCreated;
//             const { privateKey } = response.AccountCreated;
//             let walletRow;
//             if (type === 'organisation') {
//               const existingWallet = await user.getWallet();
//               if (existingWallet.length) {
//                 walletRow = {
//                   address,
//                   privateKey,
//                   CampaignId: campaign,
//                 };
//               } else {
//                 const bantuPair = createPair();
//                 walletRow = {
//                   address,
//                   privateKey,
//                   CampaignId: campaign,
//                   bantuAddress: bantuPair.publicKey,
//                   bantuPrivateKey: bantuPair.secret,
//                 };
//               }
//             } else {
//               walletRow = {
//                 address,
//                 privateKey,
//                 CampaignId: campaign,
//               };
//             }

//             await user.createWallet(walletRow);
//             msg.ack();
//           })
//           .catch(() => {
//             msg.nack();
//           });
//       })
//       .then(() => console.log('Running consumer for Create Wallet'))
//       .catch((err) => console.error(err));
//   })
//   .catch((err) => console.error(err));

// ampConn.default
//   .completeConfiguration()
//   .then(() => {
//     mintTokenQueue
//       .activateConsumer(async (msg) => {
//         const content = msg.getContent();
//         const { address } = content;
//         const { amount } = content;
//         const fundTransaction = content.fund;
//         mintToken(address, amount).then(async () => {
//           await Organisation.findOne({
//             where: { id: content.id },
//             include: {
//               model: Wallet,
//               as: 'Wallet',
//               where: {
//                 bantuAddress: {
//                   [Op.ne]: null,
//                 },
//               },
//             },
//           })
//             .then(async (org) => {
//               await org.Wallet[0]
//                 .increment('balance', { by: amount })
//                 .then(async () => {
//                   await FundAccount.findByPk(fundTransaction).then(
//                     (record) => {
//                       const recordCopy = { ...record };
//                       recordCopy.status = 'successful';
//                       record.save();
//                     },
//                   );
//                 });
//               console.log('Done');
//               msg.ack();
//             })
//             .catch((error) => {
//               console.log('An Error Occurred', error.message);
//               msg.nack();
//             });
//         });
//       })
//       .then(() => console.log('Running consumer for Mint Token'))
//       .catch((err) => console.error(err));
//   })
//   .catch((err) => console.error(err));

// ampConn.default
//   .completeConfiguration()
//   .then(() => {
//     approveToSpendQueue
//       .activateConsumer(async (msg) => {
//         const content = msg.getContent();
//         const ngoAddr = content.ngoAddress;
//         const ngoPassword = content.ngoPrivateKey;
//         const { reciever } = content;
//         const { amount } = content;
//         const transactionUuid = content.transactionId;

//         approveToSpend(ngoAddr, ngoPassword, reciever, amount)
//           .then(async (response) => {
//             const transaction = await Transaction.findOne({
//               where: { uuid: transactionUuid },
//             });
//             await transaction
//               .update({
//                 status: 'success',
//                 transactionHash: response.Approved.TransactionHash,
//               })
//               .then(async () => {
//                 const sender = await Wallet.findOne({
//                   where: { address: ngoAddr },
//                 });
//                 const recieverAdd = await Wallet.findOne({
//                   where: { address: reciever },
//                 });
//                 await sender.decrement('balance', { by: amount }).catch(() => {
//                   console.log('Could not deduct');
//                 });
//                 await recieverAdd
//                   .increment('balance', { by: amount })
//                   .catch(() => {
//                     console.log('Could not increment');
//                   });
//               })
//               .catch(() => {
//                 console.log('Could not find transaction');
//               });
//             msg.ack();
//           })
//           .catch(async () => {
//             const transaction = await Transaction.findOne({
//               where: { uuid: transactionUuid },
//             });
//             await transaction.update({ status: 'declined' });
//             msg.ack();
//           });
//       })
//       .then(() => console.log('Running consumer for Approve to Spend'))
//       .catch((err) => console.error(err));
//   })
//   .catch((err) => console.error(err));

// ampConn.default
//   .completeConfiguration()
//   .then(() => {
//     transferFromQueue
//       .activateConsumer(async (msg) => {
//         const content = msg.getContent();
//         const owner = content.ownerAddress;
//         const reciever = content.recieverAddress;
//         const spender = content.spenderAddress;
//         const spenderKey = content.senderKey;
//         const amount = Math.ceil(content.amount);
//         const { transactionId } = content;
//         const { pendingOrder } = content;
//         await Order.findOne({
//           where: { id: pendingOrder },
//           include: {
//             model: OrderProducts,
//             as: 'Cart',
//             include: {
//               model: Products,
//               as: 'Product',
//               include: { model: Market, as: 'Vendor' },
//             },
//           },
//         });

//         transferFrom(owner, spender, spenderKey, reciever, amount)
//           .then(async (response) => {
//             const gottenResponse = response.TransferedFrom;
//             const beneficiaryWallet = await Wallet.findOne({
//               where: { address: spender },
//             });
//             const vendorWallet = await Wallet.findOne({
//               where: { address: gottenResponse.Receiver },
//             });
//             const order = await Order.findOne({
//               where: { id: pendingOrder },
//               include: {
//                 model: OrderProducts,
//                 as: 'Cart',
//                 include: {
//                   model: Products,
//                   as: 'Product',
//                   include: { model: Market, as: 'Vendor' },
//                 },
//               },
//             });
//             const transactionRecord = await Transaction.findByPk(
//               transactionId,
//             );

//             await beneficiaryWallet
//               .decrement('balance', {
//                 by: gottenResponse.Amount,
//               })
//               .then(async () => {
//                 await vendorWallet
//                   .increment('balance', {
//                     by: gottenResponse.Amount,
//                   })
//                   .then(async () => {
//                     await order
//                       .update({ status: 'confirmed' })
//                       .then(async () => {
//                         await transactionRecord.update({
//                           status: 'success',
//                           is_approved: true,
//                           transactionHash: gottenResponse.TransactionHash,
//                         });

//                         order.Cart.forEach(async (cart) => {
//                           await cart.Product.decrement('quantity', {
//                             by: cart.quantity,
//                           });
//                         });
//                         msg.ack();
//                       });
//                   });
//               });
//           })
//           .catch(() => {
//             msg.nack();
//           });
//       })
//       .then(() => console.log('Running consumer for Transfer From'))
//       .catch((err) => console.error(err));
//   })
//   .catch((err) => console.error(err));

// ampConn.default
//   .completeConfiguration()
//   .then(() => {
//     transferToQueue
//       .activateConsumer(async (msg) => {
//         const content = msg.getContent();
//         const { amount } = content;
//         const { senderPass } = content;
//         const { senderAddress } = content;
//         const { reciepientAddress } = content;
//         const { transaction } = content;

//         transferTo(senderAddress, senderPass, reciepientAddress, amount)
//           .then(async (response) => {
//             console.log(response);
//             const transactionExist = await Transaction.findByPk(transaction);
//             const sender = await Wallet.findOne({
//               where: { address: senderAddress },
//             });
//             const reciever = await Wallet.findOne({
//               where: { address: reciepientAddress },
//             });
//             sender.decrement('balance', {
//               by: amount,
//             });
//             reciever.increment('balance', {
//               by: amount,
//             });
//             transactionExist.status = 'success';
//             transactionExist.transactionHash = response.Transfered.TransactionHash;
//             transactionExist.save();
//             msg.ack();
//           })
//           .catch((err) => {
//             console.log(err);
//             msg.nack();
//           });
//       })
//       .then(() => console.log('Running consumer for Transfer To'))
//       .catch((err) => console.error(err));
//   })
//   .catch((err) => console.error(err));

// ampConn.default
//   .completeConfiguration()
//   .then(() => {
//     ninVerificationQueue
//       .activateConsumer(async (msg) => {
//         const content = msg.getContent();
//         const user = await User.findByPk(content.id);

//         ninVerification(user)
//           .then(async (response) => {
//             if (response.message === 'norecord') {
//               await user.update({ status: 'suspended' });
//               msg.ack();
//             }
//             if (response.message === 'Success') {
//               const data = response.demoData[0];
//               const names = [
//                 String(data.firstname).toLowerCase(),
//                 String(data.surname).toLowerCase(),
//               ];
//               if (
//                 names.includes(String(user.first_name).toLowerCase())
//                 && names.includes(String(user.last_name).toLowerCase())
//               ) {
//                 await user.update({ status: 'activated', is_nin_verified: true });
//                 console.log('User Activated');
//               } else {
//                 await user.update({ status: 'suspended' });
//               }
//               msg.ack();
//               console.log('Concluded');
//             }
//           })
//           .catch(() => {
//             msg.nack();
//           });
//       })
//       .then(() => console.log('Running Nin Verification Queue'))
//       .catch((err) => console.error(err));
//   })
//   .catch((err) => console.error(err));
