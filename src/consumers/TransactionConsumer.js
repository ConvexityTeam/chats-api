const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  TRANSFER_TO,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_WITHDRAW,
  PAYSTACK_CAMPAIGN_DEPOSIT,
  PAYSTACK_DEPOSIT,
  PAY_FOR_PRODUCT,
  FUND_BENEFICIARY,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW,
} = require('../constants/queues.constant');
const {RabbitMq, Logger} = require('../libs');
const {
  WalletService,
  QueueService,
  BlockchainService,
  DepositService,
  PaystackService,
  SmsService,
} = require('../services');

const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  TaskAssignment,
  ProductBeneficiary,
  Order,
} = require('../models');
const {
  GenearteSMSToken,
  generateQrcodeURL,
  generateTransactionRef,
  AclRoles,
} = require('../utils');

const verifyFiatDepsoitQueue = RabbitMq['default'].declareQueue(
  VERIFY_FIAT_DEPOSIT,
  {
    durable: true,
    prefetch: 1,
  },
);

const processFundBeneficiary = RabbitMq['default'].declareQueue(
  FUND_BENEFICIARY,
  {
    durable: true,
    prefetch: 1,
  },
);
const processVendorOrderQueue = RabbitMq['default'].declareQueue(
  PROCESS_VENDOR_ORDER,
  {
    durable: true,
    prefetch: 1,
  },
);

const processCampaignFund = RabbitMq['default'].declareQueue(
  FROM_NGO_TO_CAMPAIGN,
  {
    durable: true,
    prefetch: 1,
  },
);

const processPaystack = RabbitMq['default'].declareQueue(PAYSTACK_DEPOSIT, {
  durable: true,
  prefetch: 1,
});

const processBeneficiaryPaystackWithdrawal = RabbitMq['default'].declareQueue(
  PAYSTACK_BENEFICIARY_WITHDRAW,
  {
    durable: true,
    prefetch: 1,
  },
);

const processVendorPaystackWithdrawal = RabbitMq['default'].declareQueue(
  PAYSTACK_VENDOR_WITHDRAW,
  {
    durable: true,
    prefetch: 1,
  },
);

const processCampaignPaystack = RabbitMq['default'].declareQueue(
  PAYSTACK_CAMPAIGN_DEPOSIT,
  {
    durable: true,
    prefetch: 1,
  },
);

const update_campaign = async (id, args) => {
  const campaign = await Campaign.findOne({where: {id}});
  if (!campaign) return null;
  await campaign.update(args);
  return campaign;
};

const update_order = async (reference, args) => {
  const order = await Order.findOne({where: {reference}});
  if (!order) return null;
  await order.update(args);
  return order;
};

const update_transaction = async (args, uuid) => {
  const transaction = await Transaction.findOne({where: {uuid}});
  if (!transaction) return null;
  await transaction.update(args);
  return transaction;
};
const deductWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({balance: Sequelize.literal(`balance - ${amount}`)});
  Logger.info(`Wallet amount deducted with ${amount}`)
  return wallet;
};

const addWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({balance: Sequelize.literal(`balance + ${amount}`)});
  Logger.info(`Wallet amount added with ${amount}`)
  return wallet;
};

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    verifyFiatDepsoitQueue
      .activateConsumer(async msg => {
        const {
          transactionReference,
          OrganisationId,
          approved,
          status,
          amount,
        } = msg.getContent();
        if (approved && status != 'successful' && status != 'declined') {
          Logger.info(
            `Checking data from Transaction consumer: ${
              (transactionReference, OrganisationId, approved, status, amount)
            }`,
          );
          WalletService.findMainOrganisationWallet(OrganisationId)
            .then(async wallet => {
              if (wallet) {
                const reference = generateTransactionRef();
                // const organisation = await BlockchainService.setUserKeypair(
                //   `organisation_${OrganisationId}`,
                // );
                // const mint = await BlockchainService.mintToken(
                //   organisation.address,
                //   amount,
                // );
                // if(mint){
                await DepositService.updateFiatDeposit(transactionReference, {
                  status: 'successful',
                });
                await Transaction.create({
                  log: transactionReference,
                  narration: 'Fiat Deposit Transaction',
                  ReceiverWalletId: wallet.uuid,
                  transaction_origin: 'wallet',
                  transaction_type: 'deposit',
                  status: 'success',
                  is_approved: true,
                  OrganisationId,
                  reference,
                  amount,
                });
                // await wallet.update({
                //   balance: Sequelize.literal(`balance + ${amount}`),
                //   fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`),
                // });
                msg.ack();
              } else {
                QueueService.createWallet(OrganisationId, 'organisation');
                Promise.reject('Organisation wallet does not exist');
              }
            })
            .catch(error => {
              console.log(error.message, '....///.....');
              // msg.nack();
              msg.ack();
            });
        }
      })
      .then(_ => {
        console.log(`Running Consumer For Verify Fiat Deposit.`);
      });

    processCampaignFund
      .activateConsumer(async msg => {
        const {
          OrgWallet,
          campaignWallet,
          beneficiaries,
          campaign,
          token_type,
        } = msg.getContent();
        if (
          Math.sign(OrgWallet.balance - campaign.budget) == -1 ||
          Math.sign(OrgWallet.balance - campaign.budget) == -0
        ) {
          Logger.error(
            'Insufficient wallet balance. Please fund organisation wallet.',
          );
        } else {
          Logger.info(
            'Transferring from organisation wallet to campaign wallet',
          );
          const campaignAddress = await BlockchainService.setUserKeypair(
            `campaign_${campaignWallet.CampaignId}`,
          );
          const organisationAddress = await BlockchainService.setUserKeypair(
            `organisation_${OrgWallet.OrganisationId}`,
          );
          const share = parseInt(campaign.budget / beneficiaries.length);
          const realBudget = campaign.budget;
          const parsedAmount =
            parseInt(campaign.budget / beneficiaries.length) *
            beneficiaries.length;
          const org = await BlockchainService.transferTo(
            organisationAddress.address,
            organisationAddress.privateKey,
            campaignAddress.address,
            beneficiaries.length > 0 ? parsedAmount : realBudget,
          );
          Logger.info(`Transferred to campaign wallet: ${org}`);
          if(!org){
            await Transaction.create({
            amount: beneficiaries.length > 0 ? parsedAmount : realBudget,
            reference: generateTransactionRef(),
            status: 'failed',
            transaction_origin: 'wallet',
            transaction_type: 'transfer',
            SenderWalletId: OrgWallet.uuid,
            ReceiverWalletId: campaignWallet.uuid,
            OrganisationId: campaign.OrganisationId,
            narration: 'Approve Campaign Funding',
          });
          return
          }
          await Transaction.create({
            amount: beneficiaries.length > 0 ? parsedAmount : realBudget,
            reference: generateTransactionRef(),
            status: 'success',
            transaction_origin: 'wallet',
            transaction_type: 'transfer',
            SenderWalletId: OrgWallet.uuid,
            ReceiverWalletId: campaignWallet.uuid,
            OrganisationId: campaign.OrganisationId,
            narration: 'Approve Campaign Funding',
          });
          await update_campaign(campaign.id, {
            status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
            is_funded: true,
            amount_disbursed:
              beneficiaries.length > 0 ? parsedAmount : realBudget,
          });
          await deductWalletAmount(
            beneficiaries.length > 0 ? parsedAmount : realBudget,
            OrgWallet.uuid,
          );
          await addWalletAmount(
            beneficiaries.length > 0 ? parsedAmount : realBudget,
            campaign.Wallet.uuid,
          );
          const wallet = beneficiaries.map(user => user.User.Wallets);
          const mergeWallet = [].concat.apply([], wallet);

          for (let i = 0; i < mergeWallet.length; i++) {
            const uuid = mergeWallet[i].uuid;
            const userId = mergeWallet[i].UserId;
            const beneficiary = await BlockchainService.setUserKeypair(
              `user_${userId}campaign_${campaign.id}`,
            );
          await BlockchainService.approveToSpend(
              campaignAddress.address,
              campaignAddress.privateKey,
              beneficiary.address,
              share,
            );
            await addWalletAmount(share, uuid);
          }

          const User = beneficiaries.map(user => user.User);
          for (let i = 0; i < User.length; i++) {
            let istoken = false;
            let QrCode;
            const smsToken = GenearteSMSToken();
            const qrCodeData = {
              OrganisationId: campaign.OrganisationId,
              Campaign: {id: campaign.id, title: campaign.title},
              Beneficiary: {
                id: User[i].id,
                name:
                  User[i].first_name || User[i].last_name
                    ? User[i].first_name + ' ' + User[i].last_name
                    : '',
              },
              amount: share,
            };
            if (token_type === 'papertoken') {
              QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
              istoken = true;
            } else if (token_type === 'smstoken') {
              SmsService.sendOtp(
                User[i].phone,
                `Hello ${
                  User[i].first_name || User[i].last_name
                    ? User[i].first_name + ' ' + User[i].last_name
                    : ''
                } your convexity token is ${smsToken}, you are approved to spend ${share}.`,
              );
              istoken = true;
            }
            if (istoken) {
              await VoucherToken.create({
                organisationId: campaign.OrganisationId,
                beneficiaryId: User[i].id,
                campaignId: campaign.id,
                tokenType: token_type,
                token: token_type === 'papertoken' ? QrCode : smsToken,
                amount: share,
              });
              istoken = false;
            }
          }
          msg.ack();
        }
      })
      .catch(error => {
        console.log(error.message, '....///.....');
        // msg.nack();
      });
    processPaystack
      .activateConsumer(async msg => {
        const {id, amount} = msg.getContent();
        const organisation = await BlockchainService.setUserKeypair(
          `organisation_${id}`,
        );
        Logger.info(`Getting KeyPair from AWS`);
       const mint = await BlockchainService.mintToken(organisation.address, amount);
       if(mint){
        await Wallet.update(
          {
            balance: Sequelize.literal(`balance + ${amount}`),
          },
          {
            where: {
              OrganisationId: id,
            },
          },
        );
        Logger.info(`Organisation Wallet Balance updated with: ${amount}`);
       }
  
        
      })
      .catch(() => {});

    processCampaignPaystack
      .activateConsumer(async msg => {
        const {camp_id, camp_uuid, org_uuid, org_id, amount} = msg.getContent();
        const campaign = await BlockchainService.setUserKeypair(
          `campaign_${camp_id}`,
        );
        await BlockchainService.mintToken(campaign.address, amount);
        await Wallet.update(
          {
            balance: Sequelize.literal(`balance + ${amount}`),
          },
          {
            where: {
              CampaignId: camp_id,
            },
          },
        );
        Campaign.update(
          {
            amount_disbursed: Sequelize.literal(`amount_disbursed + ${amount}`),
            is_funded: true,
          },
          {where: {id: camp_id}},
        );
        await Transaction.create({
          amount,
          reference: generateTransactionRef(),
          status: 'success',
          transaction_origin: 'wallet',
          transaction_type: 'transfer',
          SenderWalletId: org_uuid,
          ReceiverWalletId: camp_uuid,
          OrganisationId: org_id,
          narration: 'Approve Campaign Funding',
        });
      })
      .catch(() => {});

    processBeneficiaryPaystackWithdrawal
      .activateConsumer(async msg => {
        const {
          bankAccount,
          campaignWallet,
          userWallet,
          amount,
          transaction,
        } = msg.getContent();
        const campaignAddress = await BlockchainService.setUserKeypair(
            `campaign_${campaignWallet.CampaignId}`,
          );

        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}campaign_${campaignWallet.CampaignId}`,
        );
        
        const transfer = await BlockchainService.transferFrom(
          campaignAddress.address,
          beneficiary.address,
          beneficiary.address,
          beneficiary.privateKey,
          amount,
        );
        const redeem = await BlockchainService.redeem(
          beneficiary.address,
          beneficiary.privateKey,
          amount,
        );
        const payStack = await PaystackService.withdraw(
          'balance',
          amount,
          bankAccount.recipient_code,
          'spending',
        );
        if(transfer && redeem  && payStack){
          await deductWalletAmount(amount, campaignWallet.uuid);
        await deductWalletAmount(amount, userWallet.uuid);
        await update_transaction({status: 'success'}, transaction.uuid);
        return 
        }
        await update_transaction({status: 'failed'}, transaction.uuid);
      })
      .catch(() => {
        console.log('RABBITMQ ERROR');
      });

    processVendorPaystackWithdrawal
      .activateConsumer(async msg => {
        const {bankAccount, userWallet, amount, transaction} = msg.getContent();
        const vendor = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}`,
        );
       const redeem =  await BlockchainService.redeem(
          vendor.address,
          vendor.privateKey,
          amount,
        );
        const payStack = await PaystackService.withdraw(
          'balance',
          amount,
          bankAccount.recipient_code,
          'spending',
        );
        if(redeem && payStack){
        await deductWalletAmount(amount, userWallet.uuid);
        await update_transaction({status: 'success'}, transaction.uuid);
        return
        }
        await update_transaction({status: 'failed'}, transaction.uuid);
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      });

    processFundBeneficiary
      .activateConsumer(async msg => {
        const {
          beneficiaryWallet,
          campaignWallet,
          task_assignment,
          amount_disburse,
          transaction,
        } = msg.getContent();
        const campaign = BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`,
        );

        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${beneficiaryWallet.UserId}campaign_${campaignWallet.CampaignId}`,
        );
          let success = false
        const allowance = await BlockchainService.allowance(
          campaign.address,
          beneficiary.address,
        );
        if (allowance.Allowed > 0){
         const top_up = await BlockchainService.approveToSpend(
            campaign.address,
            campaign.privateKey,
            beneficiary.address,
            amount_disburse + allowance.Allowed,
          );
          if(top_up) success = true
          else success = false
        }
        else {
        const top_down =  await BlockchainService.approveToSpend(
            campaign.address,
            campaign.privateKey,
            beneficiary.address,
            amount_disburse,
          );
          if(top_down) success = true
          else success = false
          }
          if(!success){
            await update_transaction({status: 'failed'}, transaction.uuid);
            return
          }
        await addWalletAmount(amount_disburse, beneficiaryWallet.uuid);
        await deductWalletAmount(amount_disburse, campaignWallet.uuid);
        await update_transaction({status: 'success'}, transaction.uuid);
        await TaskAssignment.update(
          {status: 'disbursed'},
          {where: {id: task_assignment.id}},
        );

        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ TRANSFER ERROR: ${error}`);
      });

    processVendorOrderQueue
      .activateConsumer(async msg => {
        const {
          beneficiaryWallet,
          vendorWallet,
          campaignWallet,
          order,
          amount,
          transaction,
        } = msg.getContent();
        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${beneficiaryWallet.UserId}campaign_${campaignWallet.CampaignId}`,
        );
        const vendor = await BlockchainService.setUserKeypair(
          `user_${vendorWallet.UserId}`,
        );
        const campaign = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`,
        );
        const transfer = await BlockchainService.transferFrom(
          campaign.address,
          vendor.address,
          beneficiary.address,
          beneficiary.privateKey,
          amount,
        );
        if(!transfer){
        await update_transaction({status: 'failed'}, transaction);
        await update_order(order.reference, {status: 'failed'})
        Logger.error('Transferring from beneficiary to vendor failed')
        return null
        }
        await update_order(order.reference, {status: 'confirmed'})
        await deductWalletAmount(amount, beneficiaryWallet.uuid);
        await deductWalletAmount(amount, campaignWallet.uuid);
        await addWalletAmount(amount, vendorWallet.uuid);
        await update_transaction({status: 'success'}, transaction);
        Logger.info('Success transferring from beneficiary to vendor')
        order.Cart.forEach(async prod => {
          await ProductBeneficiary.create({
            productId: prod.ProductId,
            UserId: beneficiaryWallet.UserId,
            OrganisationId: campaignWallet.OrganisationId,
          });
        });
        await VoucherToken.update(
          {
            amount: Sequelize.literal(`balance - ${amount}`),
          },
          {
            where: {
              campaignId: campaignWallet.CampaignId,
              beneficiaryId: beneficiaryWallet.UserId,
            },
          },
        );
      })

      .then(_ => {
        console.log(`Running Process Vendor Order Queue`);
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });
