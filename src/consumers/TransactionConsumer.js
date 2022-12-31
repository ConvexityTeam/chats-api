const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_CAMPAIGN_DEPOSIT,
  PAYSTACK_DEPOSIT,
  FUND_BENEFICIARY,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW,
  FUND_BENEFICIARIES
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
    balance: Sequelize.literal(`balance + ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
  });
  Logger.info(`Wallet amount added with ${amount}`);
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

let minted = false;
let confirmed = false;
let has_run_once = false;
let benefitIndex = null;
let transfer_once = false;
let run_ben_to_bank_once = false;
let redeem_ben_once = false;
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
          const wallet = await WalletService.findMainOrganisationWallet(
            OrganisationId
          );

          let mint, confirm;
          const organisation = await BlockchainService.setUserKeypair(
            `organisation_${OrganisationId}`
          );

          if (!minted) {
            mint = await BlockchainService.mintToken(
              organisation.address,
              amount
            );

            Logger.info(`Hash: ${mint.Minted}`);
            if (mint.Minted) {
              minted = true;
              msg.nack();
            }
          }

          if (!confirm && minted) {
            confirm = await BlockchainService.confirmTransaction(mint.Minted);
            await update_transaction(
              {status: 'failed', is_approved: false},
              transactionId
            );

            if (confirm) {
              confirmed = true;
              msg.nack();
            }
          }
          Logger.info(JSON.stringify(confirm));

          if (confirm && minted) {
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
            Logger.info('Transaction confirmed');
            confirmed = false;
            minted = false;
            msg.ack();
          }
        }
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
        // msg.nack();
      })
      .then(_ => {
        Logger.info(`Running Process For Verify Fiat Deposit.`);
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

        let transfer;
        Logger.info(
          'Sending Transfer Parameter from Consumer to Blockchain Service'
        );
        if (!has_run_once) {
          transfer = await BlockchainService.transferTo(
            organisationAddress.privateKey,
            campaignAddress.address,
            realBudget
          );
          has_run_once = true;
        }

        if (!transfer) {
          await update_transaction({status: 'failed'}, transactionId);
          msg.nack();
          has_run_once = false;
          return;
        }

        const confirm = await BlockchainService.confirmTransaction(
          transfer.Transfered
        );
        if (!confirm) {
          await update_transaction({status: 'processing'}, transactionId);
          msg.nack();
          return;
        }

        if (campaign.type === 'cash-for-work') {
          await update_campaign(campaign.id, {
            status: 'active',
            is_funded: true,
            amount_disbursed: realBudget
          });
        } else
          await update_campaign(campaign.id, {
            is_funded: true
          });

        await update_transaction(
          {
            status: 'success',
            transaction_hash: transfer.Transfered,
            is_approved: true
          },
          transactionId
        );

        await deductWalletAmount(realBudget, OrgWallet.uuid);
        await addWalletAmount(realBudget, campaign.Wallet.uuid);
        has_run_once = false;
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Campaign Funding');
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
        const modulus = campaign.budget % beneficiaries.length;
        const campaignKeyPair = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        const organisationKeyPair = await BlockchainService.setUserKeypair(
          `organisation_${campaign.OrganisationId}`
        );

        if (modulus > 0 && !transfer_once) {
          await BlockchainService.transferTo(
            campaignKeyPair.privateKey,
            organisationKeyPair.address,
            modulus
          );
          transfer_once = true;
        }
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
              OrganisationId: campaign.OrganisationId
            }
          );

          let approve_to_spend;
          if ((benefitIndex && benefitIndex >= index) || !benefitIndex)
            approve_to_spend = await BlockchainService.approveToSpend(
              campaignKeyPair.privateKey,
              beneficiaryKeyPair.address,
              share
            );
          const confirm = await BlockchainService.confirmTransaction(
            approve_to_spend.Approved
          );
          if (!confirm) {
            await update_transaction({status: 'failed'}, transaction.uuid);
            benefitIndex = index;
            msg.nack();
            return;
          }

          const uuid = wallet.uuid;
          await addWalletAmount(share, uuid);
          await update_transaction(
            {status: 'success', is_approved: true},
            transaction.uuid
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
                  ? beneficiary.User.first_name +
                    ' ' +
                    beneficiary.User.last_name
                  : ''
            },
            amount: share
          };
          if (token_type === 'papertoken') {
            QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
            istoken = true;
          } else if (token_type === 'smstoken') {
            SmsService.sendOtp(
              beneficiary.User.phone,
              `Hello ${
                beneficiary.User.first_name || beneficiary.User.last_name
                  ? beneficiary.User.first_name +
                    ' ' +
                    beneficiary.User.last_name
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
              amount: share
            });
            istoken = false;
          }
        }
        // await update_campaign(campaign.id, {
        //   status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
        //   is_funded: true,
        //   amount_disbursed: beneficiaries.length > 0 ? parsedAmount : realBudget
        // });
        benefitIndex = null;
        transfer_once = false;
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(() => {
        Logger.info(`Running Process For Funding Beneficiaries`);
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
        let transfer;
        if (!run_ben_to_bank_once) {
          transfer = await BlockchainService.transferFrom(
            campaignAddress.address,
            beneficiary.address,
            beneficiary.privateKey,
            amount
          );
          run_ben_to_bank_once = true;
        }
        if (!transfer) {
          msg.nack();
          return;
        }

        const confirm = await BlockchainService.confirmTransaction(
          transfer.TransferedFrom
        );
        if (!confirm) {
          msg.nack();
          return;
        }
        let redeem;
        if (!redeem_ben_once) {
          redeem = await BlockchainService.redeem(
            beneficiary.privateKey,
            amount
          );
          redeem_ben_once = true;
        }
        if (!redeem) {
          msg.nack;
          return;
        }
        await PaystackService.withdraw(
          'balance',
          amount,
          bankAccount.recipient_code,
          'spending'
        );
        await deductWalletAmount(amount, campaignWallet.uuid);
        await deductWalletAmount(amount, userWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transaction.uuid
        );
        redeem_ben_once = false;

        run_ben_to_bank_once = false;
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

    processVendorPaystackWithdrawal
      .activateConsumer(async msg => {
        const {bankAccount, userWallet, amount, transaction} = msg.getContent();
        const vendor = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}`
        );
        const redeem = await BlockchainService.redeem(
          vendor.privateKey,
          amount
        );
        const confirm = await BlockchainService.confirmTransaction(
          redeem.Redeemed
        );
        if (!confirm) {
          msg.nack();
          await update_transaction({status: 'failed'}, transaction.uuid);
        }
        await PaystackService.withdraw(
          'balance',
          amount,
          bankAccount.recipient_code,
          'spending'
        );
        await deductWalletAmount(amount, userWallet.uuid);
        await update_transaction({status: 'success'}, transaction.uuid);
        msg.ack();
        return;
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info('Running Process For Vendor Liquidation to Bank Account');
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
        const campaign = BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );

        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${beneficiaryWallet.UserId}campaign_${campaignWallet.CampaignId}`
        );

        const approve_to_spend = await BlockchainService.approveToSpend(
          campaign.privateKey,
          beneficiary.address,
          amount_disburse
        );
        const confirm = await BlockchainService.confirmTransaction(
          approve_to_spend.Approved
        );
        if (!confirm) {
          await update_transaction({status: 'failed'}, transaction.uuid);
          msg.nack();
          return;
        }
        await addWalletAmount(amount_disburse, beneficiaryWallet.uuid);
        await deductWalletAmount(amount_disburse, campaignWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transaction.uuid
        );
        await TaskAssignment.update(
          {status: 'disbursed'},
          {where: {id: task_assignment.id}}
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
          amount
        );
        const confirm = await BlockchainService.confirmTransaction(
          transfer.TransferedFrom
        );
        if (!confirm) {
          await update_transaction({status: 'failed'}, transaction);
          await update_order(order.reference, {status: 'failed'});
          msg.nack();
          return null;
        }
        await update_order(order.reference, {status: 'confirmed'});
        await deductWalletAmount(amount, beneficiaryWallet.uuid);
        await deductWalletAmount(amount, campaignWallet.uuid);
        await addWalletAmount(amount, vendorWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transaction
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
            amount: Sequelize.literal(`balance - ${amount}`)
          },
          {
            where: {
              campaignId: campaignWallet.CampaignId,
              beneficiaryId: beneficiaryWallet.UserId
            }
          }
        );
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(`Running Process For Vendor Order Queue`);
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error: ${error}`);
  });
