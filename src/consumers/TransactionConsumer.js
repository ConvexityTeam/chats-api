const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_CAMPAIGN_DEPOSIT,
  PAYSTACK_DEPOSIT,
  FUND_BENEFICIARY,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW,
  FUND_BENEFICIARIES,
  TRANSFER_FROM_TO_BENEFICIARY,
  CONFIRM_NGO_FUNDING,
  CONFIRM_CAMPAIGN_FUNDING,
  CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
  CONFIRM_VENDOR_ORDER_QUEUE,
  CONFIRM_FUND_SINGLE_BENEFICIARY,
  CONFIRM_BENEFICIARY_REDEEM,
  CONFIRM_VENDOR_REDEEM,
  CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
  REDEEM_BENEFICIARY_ONCE,
  SEND_EACH_BENEFICIARY_FOR_REDEEMING,
  SEND_EACH_BENEFICIARY_FOR_CONFIRMATION,
  INCREASE_ALLOWANCE
} = require('../constants/queues.constant');
const {RabbitMq, Logger} = require('../libs');
const {
  WalletService,
  QueueService,
  BlockchainService,
  DepositService,
  PaystackService,
  SmsService
} = require('../services');

const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  TaskAssignment,
  ProductBeneficiary,
  Order
} = require('../models');
const {
  GenearteSMSToken,
  generateQrcodeURL,
  generateTransactionRef,
  AclRoles
} = require('../utils');
const {RERUN_QUEUE_AFTER} = require('../constants/rerun.queue');

const verifyFiatDepsoitQueue = RabbitMq['default'].declareQueue(
  VERIFY_FIAT_DEPOSIT,
  {
    durable: true,
    prefetch: 1
  }
);

const processFundBeneficiary = RabbitMq['default'].declareQueue(
  FUND_BENEFICIARY,
  {
    durable: true,
    prefetch: 1
  }
);
const processFundBeneficiaries = RabbitMq['default'].declareQueue(
  FUND_BENEFICIARIES,
  {
    durable: true,
    prefetch: 1
  }
);
const processVendorOrderQueue = RabbitMq['default'].declareQueue(
  PROCESS_VENDOR_ORDER,
  {
    durable: true,
    prefetch: 1
  }
);

const processCampaignFund = RabbitMq['default'].declareQueue(
  FROM_NGO_TO_CAMPAIGN,
  {
    durable: true,
    prefetch: 1
  }
);

const processPaystack = RabbitMq['default'].declareQueue(PAYSTACK_DEPOSIT, {
  durable: true,
  prefetch: 1
});

const processBeneficiaryPaystackWithdrawal = RabbitMq['default'].declareQueue(
  PAYSTACK_BENEFICIARY_WITHDRAW,
  {
    durable: true,
    prefetch: 1
  }
);

const processVendorPaystackWithdrawal = RabbitMq['default'].declareQueue(
  PAYSTACK_VENDOR_WITHDRAW,
  {
    durable: true,
    prefetch: 1
  }
);

const processCampaignPaystack = RabbitMq['default'].declareQueue(
  PAYSTACK_CAMPAIGN_DEPOSIT,
  {
    durable: true,
    prefetch: 1
  }
);

const beneficiaryFundBeneficiary = RabbitMq['default'].declareQueue(
  TRANSFER_FROM_TO_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmNgoFunding = RabbitMq['default'].declareQueue(
  CONFIRM_NGO_FUNDING,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmCampaignFunding = RabbitMq['default'].declareQueue(
  CONFIRM_CAMPAIGN_FUNDING,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmBFundingBeneficiary = RabbitMq['default'].declareQueue(
  CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmOrderQueue = RabbitMq['default'].declareQueue(
  CONFIRM_VENDOR_ORDER_QUEUE,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmFundSingleB = RabbitMq['default'].declareQueue(
  CONFIRM_FUND_SINGLE_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmVRedeem = RabbitMq['default'].declareQueue(CONFIRM_VENDOR_REDEEM, {
  prefetch: 1,
  durable: true
});

const confirmBRedeem = RabbitMq['default'].declareQueue(
  CONFIRM_BENEFICIARY_REDEEM,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmBTransferRedeem = RabbitMq['default'].declareQueue(
  CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
  {
    prefetch: 1,
    durable: true
  }
);

const redeemBeneficiaryOnce = RabbitMq['default'].declareQueue(
  REDEEM_BENEFICIARY_ONCE,
  {
    prefetch: 1,
    durable: true
  }
);

const sendBForConfirmation = RabbitMq['default'].declareQueue(
  SEND_EACH_BENEFICIARY_FOR_CONFIRMATION,
  {
    prefetch: 1,
    durable: true
  }
);

const sendBForRedeem = RabbitMq['default'].declareQueue(
  SEND_EACH_BENEFICIARY_FOR_REDEEMING,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseAllowance = RabbitMq['default'].declareQueue(INCREASE_ALLOWANCE, {
  prefetch: 1,
  durable: true
});

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
  await wallet.update({
    balance: Sequelize.literal(`balance - ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance - ${amount}`)
  });
  Logger.info(`Wallet amount deducted with ${amount}`);
  return wallet;
};

const addWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true,
    balance: Sequelize.literal(`balance + ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
  });
  Logger.info(`Wallet amount added with ${amount}`);
  return wallet;
};

const blockchainBalance = async (balance, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true,
    balance,
    fiat_balance: balance
  });
  Logger.info(`Blockchain Wallet balance is ${balance}`);
  return wallet;
};

const create_transaction = async (amount, sender, receiver, args) => {
  const transaction = await Transaction.create({
    amount,
    reference: generateTransactionRef(),
    status: 'processing',
    transaction_origin: 'wallet',
    transaction_type: 'transfer',
    SenderWalletId: sender,
    ReceiverWalletId: receiver,
    narration: 'Approve Beneficiary Funding',
    ...args
  });
  return transaction;
};

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    verifyFiatDepsoitQueue
      .activateConsumer(async msg => {
        const {
          transactionId,
          transactionReference,
          OrganisationId,
          approved,
          status,
          amount
        } = msg.getContent();
        if (approved && status != 'successful' && status != 'declined') {
          const organisation = await BlockchainService.setUserKeypair(
            `organisation_${OrganisationId}`
          );
          const message = msg.getContent();
          const mint = await BlockchainService.mintToken(
            organisation.address,
            amount,
            message
          );

          if (!mint) {
            msg.nack();
            return;
          }
          await update_transaction(
            {transaction_hash: mint.Minted},
            transactionId
          );
          await QueueService.confirmNGO_FUNDING(
            OrganisationId,
            mint.Minted,
            transactionId,
            transactionReference,
            amount
          );
        }
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
        // msg.nack();
      })
      .then(_ => {
        Logger.info(`Running Process For Verify Fiat Deposit.`);
      });
    confirmNgoFunding
      .activateConsumer(async msg => {
        const {
          OrganisationId,
          hash,
          transactionId,
          transactionReference,
          amount
        } = msg.getContent();
        const wallet = await WalletService.findMainOrganisationWallet(
          OrganisationId
        );

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_NGO_FUNDING,
          msg.getContent()
        );

        if (!confirm) {
          msg.nack();
          return;
        }
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        await wallet.update({
          balance: Sequelize.literal(`balance + ${amount}`),
          fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
        });
        await DepositService.updateFiatDeposit(transactionReference, {
          status: 'successful'
        });
        Logger.info('NGO funded');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
        // msg.nack();
      })
      .then(_ => {
        Logger.info(`Running Process For Confirming NGO funding.`);
      });
    processCampaignFund
      .activateConsumer(async msg => {
        const {
          OrgWallet,
          campaignWallet,
          campaign,
          transactionId,
          realBudget
        } = msg.getContent();
        const campaignAddress = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        const organisationAddress = await BlockchainService.setUserKeypair(
          `organisation_${OrgWallet.OrganisationId}`
        );

        const privateKey = `${organisationAddress.privateKey}`;
        const address = `${campaignAddress.address}`;
        Logger.info(`PrivateKey: ${privateKey}`);
        Logger.info(`address: ${address}`);
        const transfer = await BlockchainService.transferTo(
          privateKey,
          address,
          realBudget,
          {
            transactionId,
            campaign,
            OrgWallet,
            realBudget
          },
          'fundCampaign'
        );

        if (!transfer) {
          msg.nack();
          return;
        }
        await update_campaign(campaign.id, {
          is_processing: true
        });

        await update_transaction(
          {
            transaction_hash: transfer.Transfered
          },
          transactionId
        );
        await QueueService.confirmCampaign_FUNDING(
          transfer.Transfered,
          transactionId,
          campaign,
          OrgWallet,
          realBudget
        );
        Logger.info('CAMPAIGN HASH SENT FOR CONFIRMATION');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Campaign Funding');
      });

    confirmCampaignFunding
      .activateConsumer(async msg => {
        const {
          hash,
          transactionId,
          campaign,
          OrgWallet,
          amount
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_CAMPAIGN_FUNDING,
          msg.getContent()
        );

        if (!confirm) {
          msg.nack();
          return;
        }
        if (campaign.type === 'cash-for-work') {
          await update_campaign(campaign.id, {
            status: 'active',
            is_funded: true,
            is_processing: false,
            amount_disbursed: amount
          });
        } else
          await update_campaign(campaign.id, {
            is_funded: true,
            is_processing: false
          });

        await update_transaction(
          {
            status: 'success',
            transaction_hash: hash,
            is_approved: true
          },
          transactionId
        );

        await deductWalletAmount(amount, OrgWallet.uuid);
        await addWalletAmount(amount, campaign.Wallet.uuid);
        Logger.info('CAMPAIGN FUNDED');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Confirm Campaign Funding');
      });
    increaseAllowance
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'increaseAllowance',
          {
            password: keys.ownerPassword,
            spenderPswd: keys.spenderAdd,
            amount: keys.amount.toString()
          }
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        Logger.info(`gasFee: ${JSON.stringify(gasFee)}`);
        await QueueService.sendBForConfirmation(gasFee.retried, ...message);

        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Increasing Allowance');
      });
    processFundBeneficiaries
      .activateConsumer(async msg => {
        const {
          OrgWallet,
          campaignWallet,
          beneficiaries,
          campaign,
          token_type
        } = msg.getContent();
        const campaignKeyPair = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        let lastIndex;
        const realBudget = campaign.budget;
        const parsedAmount =
          parseInt(campaign.budget / beneficiaries.length) *
          beneficiaries.length;
        for (let [index, beneficiary] of beneficiaries.entries()) {
          let wallet = beneficiary.User.Wallets[0];

          const beneficiaryKeyPair = await BlockchainService.setUserKeypair(
            `user_${wallet.UserId}campaign_${campaign.id}`
          );
          const share = parseInt(campaign.budget / beneficiaries.length);

          const transaction = await create_transaction(
            beneficiaries.length > 0 ? parsedAmount : realBudget,
            OrgWallet.uuid,
            wallet.uuid,
            {
              BeneficiaryId: wallet.UserId,
              OrganisationId: campaign.OrganisationId,
              CampaignId: campaign.id
            }
          );
          if (beneficiaries.length - 1 == index) {
            lastIndex = index;
          }

          setTimeout(async () => {
            await QueueService.sendBForRedeem(
              share,
              transaction.uuid,
              wallet.uuid,
              campaign,
              beneficiary,
              campaignKeyPair.privateKey,
              beneficiaryKeyPair.address,
              realBudget,
              lastIndex,
              token_type
            );
          }, index * 5000);
        }
        Logger.info('Sent for approving to spend');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(() => {
        Logger.info(`Running Process For Funding Beneficiaries`);
      });

    sendBForRedeem
      .activateConsumer(async msg => {
        const {
          amount,
          transactionId,
          wallet_uuid,
          campaign,
          beneficiary,
          campaignPrivateKey,
          BAddress,
          budget,
          lastIndex,
          token_type
        } = msg.getContent();
        const {Approved} = await BlockchainService.approveToSpend(
          campaignPrivateKey,
          BAddress,
          amount,
          {
            amount,
            transactionId,
            wallet_uuid,
            campaign,
            beneficiary,
            budget,
            lastIndex,
            token_type
          }
        );
        await update_transaction({transaction_hash: Approved}, transactionId);
        if (!Approved) {
          msg.nack();
          return;
        }

        await QueueService.sendBForConfirmation(
          Approved,
          amount,
          transactionId,
          wallet_uuid,
          campaign,
          beneficiary,
          budget,
          lastIndex,
          token_type
        );
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(() => {
        Logger.info(`Running Process For Approving Beneficiaries`);
      });
    sendBForConfirmation
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          transactionId,
          uuid,
          campaign,
          beneficiary,
          budget,
          lastIndex,
          token_type
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(hash);
        if (!confirm) {
          msg.nack();
          return;
        }
        await addWalletAmount(amount, uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        let istoken = false;
        let QrCode;
        const smsToken = GenearteSMSToken();
        const qrCodeData = {
          OrganisationId: campaign.OrganisationId,
          Campaign: {id: campaign.id, title: campaign.title},
          Beneficiary: {
            id: beneficiary.UserId,
            name:
              beneficiary.User.first_name || beneficiary.User.last_name
                ? beneficiary.User.first_name + ' ' + beneficiary.User.last_name
                : ''
          },
          amount
        };
        if (token_type === 'papertoken') {
          QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
          istoken = true;
        } else if (token_type === 'smstoken') {
          SmsService.sendOtp(
            beneficiary.User.phone,
            `Hello ${
              beneficiary.User.first_name || beneficiary.User.last_name
                ? beneficiary.User.first_name + ' ' + beneficiary.User.last_name
                : ''
            } your convexity token is ${smsToken}, you are approved to spend ${share}.`
          );
          istoken = true;
        }
        if (istoken) {
          await VoucherToken.create({
            organisationId: campaign.OrganisationId,
            beneficiaryId: beneficiary.User.id,
            campaignId: campaign.id,
            tokenType: token_type,
            token: token_type === 'papertoken' ? QrCode : smsToken,
            amount
          });
          istoken = false;
        }

        lastIndex &&
          (await update_campaign(campaign.id, {
            status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
            is_funded: true,
            amount_disbursed: budget
          }));

        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(() => {
        Logger.info(`Running Process For Sending Beneficiary For Confirmation`);
      });
    processCampaignPaystack
      .activateConsumer(async msg => {
        const {camp_id, camp_uuid, org_uuid, org_id, amount} = msg.getContent();
        const campaign = await BlockchainService.setUserKeypair(
          `campaign_${camp_id}`
        );
        await BlockchainService.mintToken(campaign.address, amount);
        await Wallet.update(
          {
            balance: Sequelize.literal(`balance + ${amount}`)
          },
          {
            where: {
              CampaignId: camp_id
            }
          }
        );
        Campaign.update(
          {
            amount_disbursed: Sequelize.literal(`amount_disbursed + ${amount}`),
            is_funded: true
          },
          {where: {id: camp_id}}
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
          narration: 'Approve Campaign Funding'
        });
        msg.ack();
      })
      .catch(() => {});

    processBeneficiaryPaystackWithdrawal
      .activateConsumer(async msg => {
        const {
          bankAccount,
          campaignWallet,
          userWallet,
          amount,
          transaction
        } = msg.getContent();
        const campaignAddress = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );

        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}campaign_${campaignWallet.CampaignId}`
        );

        const transfer = await BlockchainService.transferFrom(
          campaignAddress.address,
          beneficiary.address,
          beneficiary.privateKey,
          amount,
          {
            privateKey: beneficiary.privateKey,
            transactionId: transaction.uuid,
            amount,
            recipient_code: bankAccount.recipient_code,
            userWallet,
            campaignWallet
          },
          'withdrawal'
        );

        if (!transfer) {
          msg.nack();
          return;
        }
        await QueueService.confirmBTransferRedeem(
          transfer.TransferedFrom,
          beneficiary.privateKey,
          transaction.uuid,
          amount,
          bankAccount.recipient_code,
          userWallet,
          campaignWallet
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Beneficiary Liquidation to Bank Account'
        );
      });
    confirmBTransferRedeem.activateConsumer(async msg => {
      const {
        hash,
        privateKey,
        transactionId,
        amount,
        recipient_code,
        userWallet,
        campaignWallet
      } = msg.getContent();

      const confirm = await BlockchainService.confirmTransaction(hash);

      if (!confirm) {
        msg.nack();
        return;
      }
      await update_transaction({transaction_hash: hash}, transactionId);
      await QueueService.confirmBRedeem(
        privateKey,
        transactionId,
        amount,
        recipient_code,
        userWallet,
        campaignWallet
      );
    });
    confirmBRedeem
      .activateConsumer(async msg => {
        const {
          privateKey,
          transactionId,
          amount,
          recipient_code,
          userWallet,
          campaignWallet
        } = msg.getContent();
        const redeem = await BlockchainService.redeem(
          privateKey,
          amount,
          {
            amount,
            transactionId,
            campaignWallet,
            userWallet,
            recipient_code
          },
          'beneficiaryRedeem'
        );
        if (!redeem) {
          msg.nack();
          return;
        }
        await QueueService.redeemBeneficiaryOnce(
          redeem.Redeemed,
          amount,
          transactionId,
          campaignWallet,
          userWallet,
          recipient_code
        );
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info('Running Process For Redeem confirmation');
      });
    redeemBeneficiaryOnce
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          transactionId,
          campaignWallet,
          userWallet,
          recipient_code
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
          msg.getContent()
        );
        if (!confirm) {
          msg.nack();
          return;
        }
        await PaystackService.withdraw(
          'balance',
          amount,
          recipient_code,
          'spending'
        );
        await deductWalletAmount(amount, campaignWallet.uuid);
        await deductWalletAmount(amount, userWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Confirming Liquidation to Bank Account'
        );
      });
    processVendorPaystackWithdrawal
      .activateConsumer(async msg => {
        const {bankAccount, userWallet, amount, transaction} = msg.getContent();
        const vendor = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}`
        );
        const redeem = await BlockchainService.redeem(
          vendor.privateKey,
          amount,
          {
            amount,
            recipient_code: bankAccount.recipient_code,
            transactionId: transaction.uuid,
            uuid: userWallet.uuid
          },
          'vendorRedeem'
        );

        if (!redeem) {
          msg.nack();
          return;
        }
        await QueueService.confirmVRedeem(
          redeem.Redeemed,
          amount,
          bankAccount.recipient_code,
          transaction.uuid,
          userWallet.uuid
        );
        Logger.info('VENDOR REDEEM HASH SENT FOR CONFIRMATION');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info('Running Process For Vendor Liquidation to Bank Account');
      });
    confirmVRedeem
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          recipient_code,
          transactionId,
          uuid
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_VENDOR_REDEEM,
          msg.getContent()
        );

        if (!confirm) {
          msg.nack();
          return;
        }
        await PaystackService.withdraw(
          'balance',
          amount,
          recipient_code,
          'spending'
        );
        await deductWalletAmount(amount, uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Confirming Vendor Liquidation to Bank Account'
        );
      });
    processFundBeneficiary
      .activateConsumer(async msg => {
        const {
          beneficiaryWallet,
          campaignWallet,
          task_assignment,
          amount_disburse,
          transaction
        } = msg.getContent();
        const campaign = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${beneficiaryWallet.UserId}campaign_${beneficiaryWallet.CampaignId}`
        );
        const approve_to_spend = await BlockchainService.approveToSpend(
          campaign.privateKey,
          beneficiary.address,
          amount_disburse
        );

        if (!approve_to_spend) {
          msg.nack();
          return;
        }

        await QueueService.confirmFundSingleB(
          approve_to_spend.Approved,
          transaction.uuid,
          task_assignment.id,
          beneficiaryWallet,
          campaignWallet,
          amount_disburse
        );
        Logger.info(
          'HASH FOR FUNDING BENEFICIARY FOR COMPLETION OF TASK SENT FOR CONFIRMATION'
        );

        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ TRANSFER ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Funding Beneficiary For Completing Task'
        );
      });
    confirmFundSingleB
      .activateConsumer(async msg => {
        const {
          hash,
          transactionId,
          task_assignmentId,
          beneficiaryWallet,
          campaignWallet,
          amount
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_FUND_SINGLE_BENEFICIARY,
          msg.getContent()
        );

        if (!confirm) {
          msg.nack();
          return;
        }
        await addWalletAmount(amount, beneficiaryWallet.uuid);
        await deductWalletAmount(amount, campaignWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        await TaskAssignment.update(
          {status: 'disbursed'},
          {where: {id: task_assignmentId}}
        );
        Logger.info('BENEFICIARY PAID FOR COMPLETION OF TASK');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ TRANSFER ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Confirming Funding Beneficiary For Completing Task'
        );
      });
    processVendorOrderQueue
      .activateConsumer(async msg => {
        const {
          beneficiaryWallet,
          vendorWallet,
          campaignWallet,
          order,
          amount,
          transaction
        } = msg.getContent();
        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${beneficiaryWallet.UserId}campaign_${campaignWallet.CampaignId}`
        );
        const vendor = await BlockchainService.setUserKeypair(
          `user_${vendorWallet.UserId}`
        );
        const campaign = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        const transfer = await BlockchainService.transferFrom(
          campaign.address,
          vendor.address,
          beneficiary.privateKey,
          amount,
          {
            amount,
            transaction,
            order,
            beneficiaryWallet,
            campaignWallet,
            vendorWallet
          },
          'vendorWithdrawal'
        );
        if (!transfer) {
          msg.nack();
          return null;
        }

        await QueueService.confirmVendorOrder(
          transfer.TransferedFrom,
          amount,
          transaction,
          order,
          beneficiaryWallet,
          campaignWallet,
          vendorWallet
        );
        Logger.info('BENEFICIARY ORDER SENT FOR CONFIRMATION');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(`Running Process For Vendor Order Queue`);
      });
    confirmOrderQueue
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          transactionId,
          order,
          beneficiaryWallet,
          campaignWallet,
          vendorWallet
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_VENDOR_ORDER_QUEUE,
          msg.getContent()
        );

        if (!confirm) {
          msg.nack();
          return;
        }
        await update_order(order.reference, {status: 'confirmed'});
        await deductWalletAmount(amount, beneficiaryWallet.uuid);
        await deductWalletAmount(amount, campaignWallet.uuid);
        const token = await BlockchainService.balance(vendorWallet.address);
        const balance = Number(token.Balance.split(',').join(''));
        // await addWalletAmount(amount, vendorWallet.uuid);
        await blockchainBalance(balance, vendorWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        order.Cart.forEach(async prod => {
          await ProductBeneficiary.create({
            productId: prod.ProductId,
            UserId: beneficiaryWallet.UserId,
            OrganisationId: campaignWallet.OrganisationId
          });
        });
        await VoucherToken.update(
          {
            amount: Sequelize.literal(`amount - ${amount}`)
          },
          {
            where: {
              campaignId: campaignWallet.CampaignId,
              beneficiaryId: beneficiaryWallet.UserId
            }
          }
        );
        Logger.info('ORDER CONFIRMED');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(_ => {
        Logger.info(`Running Process For Confirming Vendor Order Queue`);
      });
    beneficiaryFundBeneficiary
      .activateConsumer(async msg => {
        const {
          senderWallet,
          receiverWallet,
          amount,
          transaction,
          campaignWallet
        } = msg.getContent();
        const transactionId = transaction.uuid;
        let hash;
        const RWallet = await BlockchainService.setUserKeypair(
          `user_${receiverWallet.UserId}`
        );
        if (campaignWallet) {
          const beneficiary = await BlockchainService.setUserKeypair(
            `user_${senderWallet.UserId}campaign_${senderWallet.CampaignId}`
          );

          const campaign = await BlockchainService.setUserKeypair(
            `campaign_${senderWallet.CampaignId}`
          );
          const transferFrom = await BlockchainService.transferFrom(
            campaign.address,
            RWallet.address,
            beneficiary.privateKey,
            amount,
            {
              amount,
              senderWallet,
              receiverWallet,
              transactionId,
              campaignWallet
            },
            'BFundB'
          );

          if (!transferFrom) {
            msg.nack();
            return;
          }
          hash = transferFrom.TransferedFrom;
        }

        if (!campaignWallet) {
          const beneficiary = await BlockchainService.setUserKeypair(
            `user_${senderWallet.UserId}`
          );
          const transferTo = await BlockchainService.transferTo(
            beneficiary.privateKey,
            RWallet.address,
            amount,
            {
              amount,
              senderWallet,
              receiverWallet,
              transactionId,
              campaignWallet
            },
            'BFundB'
          );
          if (!transferTo) {
            msg.nack();
            return;
          }
          hash = transferTo.Transfered;
        }
        await QueueService.confirmBFundingB(
          hash,
          amount,
          senderWallet,
          receiverWallet,
          transactionId,
          campaignWallet
        );

        Logger.info(
          'BENEFICIARY TO BENEFICIARY TRANSFER SENT FOR CONFIRMATION'
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(`Running Process For Beneficiary to Beneficiary Transfer`);
      });
    confirmBFundingBeneficiary
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          senderWallet,
          receiverWallet,
          transactionId,
          campaignWallet
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
          msg.getContent()
        );
        if (!confirm) {
          msg.nack();
          return;
        }
        await deductWalletAmount(amount, senderWallet.uuid);
        await addWalletAmount(amount, receiverWallet.uuid);
        campaignWallet &&
          (await deductWalletAmount(amount, campaignWallet.uuid));
        await update_transaction(
          {
            status: 'success',
            is_approved: true,
            transaction_hash: hash
          },
          transactionId
        );
        Logger.info('BENEFICIARY TRANSFER TO BENEFICIARY SUCCESS');
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(
          `Running Process For Confirming Beneficiary to Beneficiary Transfer`
        );
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error: ${error}`);
  });
