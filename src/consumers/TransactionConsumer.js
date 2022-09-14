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
  campaign.update(args);
  return campaign;
};

const update_transaction = async (args, uuid) => {
  const transaction = await Transaction.findOne({where: {uuid}});
  if (!transaction) return null;
  transaction.update(args);
  return transaction;
};
const deductWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  wallet.update({balance: Sequelize.literal(`balance - ${amount}`)});
  return wallet;
};

const addWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  wallet.update({balance: Sequelize.literal(`balance + ${amount}`)});
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
          Logger.info(`Checking data from Transaction consumer: ${
            transactionReference,
          OrganisationId,
          approved,
          status,
          amount
          }`)
          WalletService.findMainOrganisationWallet(OrganisationId)
            .then(async wallet => {
              if (wallet) {
                const reference = generateTransactionRef();
                const organisation = await BlockchainService.setUserKeypair(
                  `organisation_${OrganisationId}`,
                );
                const mint = await BlockchainService.mintToken(
                  organisation.address,
                  amount,
                );
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
                await wallet.update({
                  balance: Sequelize.literal(`balance + ${amount}`),
                  fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`),
                });
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
          const campaign = await BlockchainService.setUserKeypair(
            `campaign_${campaignWallet.CampaignId}`,
          );
          const organisation = await BlockchainService.setUserKeypair(
            `organisation_${OrgWallet.OrganisationId}`,
          );
          const share = parseInt(campaign.budget / beneficiaries.length)
          const realBudget = campaign.budget
          const parsedAmount =  parseInt(campaign.budget / beneficiaries.length) * beneficiaries.length 
          Logger.info(`Campaign Address: ${campaign.address}, Organisation Address: ${organisation.address}`)
          Logger.info(`Parsed amount: ${beneficiaries.length > 0 ? parsedAmount : realBudget}`);
          const org = await BlockchainService.transferTo(
            organisation.address,
            organisation.privateKey,
            campaign.address,
            beneficiaries.length > 0 ? parsedAmount : realBudget,
          );
          Logger.info(`Transferred to campaign wallet: ${org}`);

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
            amount_disbursed: beneficiaries.length > 0 ? parsedAmount : realBudget,
          });
          await deductWalletAmount(beneficiaries.length > 0 ? parsedAmount : realBudget, OrgWallet.uuid);
          await addWalletAmount(beneficiaries.length > 0 ? parsedAmount : realBudget, campaign.Wallet.uuid);
          const wallet = beneficiaries.map(user => user.User.Wallets);
          const mergeWallet = [].concat.apply([], wallet);

          for (let i = 0; i < mergeWallet.length; i++) {
            const uuid = mergeWallet[i].uuid;
            const userId = mergeWallet[i].UserId;
            const beneficiary = await BlockchainService.setUserKeypair(
              `user_${userId}`,
            );
            const campaign = await BlockchainService.setUserKeypair(
              `campaign_${campaign.Wallet.CampaignId}`,
            );
            await BlockchainService.approveToSpend(
              campaign.address,
              campaign.privateKey,
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
        Logger.info(`Getting KeyPair from AWS`)
        await BlockchainService.mintToken(organisation.address, amount);
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
        Logger.info(`Organisation Wallet Balance updated with: ${amount}`)
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
        const [beneficiary, campaign] = await Promise.all(
          BlockchainService.setUserKeypair(`user_${userWallet.UserId}`),
          BlockchainService.setUserKeypair(
            `campaign_${campaignWallet.CampaignId}`,
          ),
        );
        await BlockchainService.transferFrom(
          campaign.address,
          beneficiary.address,
          beneficiary.address,
          beneficiary.privateKey,
          amount,
        );
        await BlockchainService.redeem(
          beneficiary.address,
          beneficiary.privateKey,
          amount,
        );
        await PaystackService.withdraw(
          'balance',
          amount,
          bankAccount.recipient_code,
          'spending',
        );
        await Promise.all(
          deductWalletAmount(amount, campaignWallet.uuid),
          deductWalletAmount(amount, userWallet.uuid),
          update_transaction({status: 'success'}, transaction.uuid),
        );
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
        await BlockchainService.redeem(
          vendor.address,
          vendor.privateKey,
          amount,
        );
        await PaystackService.withdraw(
          'balance',
          amount,
          bankAccount.recipient_code,
          'spending',
        );
        await deductWalletAmount(amount, userWallet.uuid);
        await update_transaction({status: 'success'}, transaction.uuid);
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
        const [beneficiary, campaign] = await Promise.all(
          BlockchainService.setUserKeypair(`user_${beneficiaryWallet.UserId}`),
          BlockchainService.setUserKeypair(
            `campaign_${campaignWallet.CampaignId}`,
          ),
        );

        const allowance = await BlockchainService.allowance(
          campaign.address,
          beneficiary.address,
        );
        if (allowance.Allowed > 0)
          await BlockchainService.approveToSpend(
            campaign.address,
            campaign.privateKey,
            beneficiary.address,
            amount_disburse + allowance.Allowed,
          );
        else
          await BlockchainService.approveToSpend(
            campaign.address,
            campaign.privateKey,
            beneficiary.address,
            amount_disburse,
          );

        await Promise.all(
          addWalletAmount(amount_disburse, beneficiaryWallet.uuid),
          deductWalletAmount(amount_disburse, campaignWallet.uuid),
          update_transaction({status: 'success'}, transaction.uuid),
          TaskAssignment.update(
            {status: 'disbursed'},
            {where: {id: task_assignment.id}},
          ),
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
        const [beneficiary, vendor, campaign] = await Promise.all(
          BlockchainService.setUserKeypair(`user_${beneficiaryWallet.UserId}`),
          BlockchainService.setUserKeypair(`user_${vendorWallet.UserId}`),
          BlockchainService.setUserKeypair(
            `campaign_${campaignWallet.CampaignId}`,
          ),
        );
        await BlockchainService.transferFrom(
          campaign.address,
          vendor.address,
          beneficiary.address,
          beneficiary.privateKey,
          amount,
        );
        Order.update(
          {status: 'confirmed'},
          {where: {reference: order.reference}},
        );
        await Promise.all(
          deductWalletAmount(amount, beneficiaryWallet.uuid),
          deductWalletAmount(amount, campaignWallet.uuid),
          addWalletAmount(amount, vendorWallet.uuid),
          update_transaction({status: 'success'}, transaction),
        );

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
