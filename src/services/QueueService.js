const {Message} = require('@droidsolutions-oss/amqp-ts');
const {Transaction} = require('../models');
const {RabbitMq} = require('../libs');
const {generateTransactionRef, AclRoles} = require('../utils');
const {
  CREATE_WALLET,
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  FUND_BENEFICIARY,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_DEPOSIT,
  TRANSFER_TO,
  PAY_FOR_PRODUCT,
  PAYSTACK_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_CAMPAIGN_DEPOSIT,
} = require('../constants/queues.constant');

const fundBeneficiary = RabbitMq['default'].declareQueue(FUND_BENEFICIARY, {
  durable: true,
});
const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true,
});
const payStackDepositQueue = RabbitMq['default'].declareQueue(
  PAYSTACK_DEPOSIT,
  {
    durable: true,
  },
);

const payStackCampaignDepositQueue = RabbitMq['default'].declareQueue(
  PAYSTACK_CAMPAIGN_DEPOSIT,
  {
    durable: true,
  },
);

const verifyFaitDepositQueue = RabbitMq['default'].declareQueue(
  VERIFY_FIAT_DEPOSIT,
  {
    durable: true,
  },
);

const processOrderQueue = RabbitMq['default'].declareQueue(
  PROCESS_VENDOR_ORDER,
  {
    durable: true,
  },
);

const approveCampaignAndFund = RabbitMq['default'].declareQueue(
  FROM_NGO_TO_CAMPAIGN,
  {
    durable: true,
  },
);

const fundVendorBankAccount = RabbitMq['default'].declareQueue(
  PAYSTACK_VENDOR_WITHDRAW,
  {
    durable: true,
  },
);

const fundBeneficiaryBankAccount = RabbitMq['default'].declareQueue(
  PAYSTACK_BENEFICIARY_WITHDRAW,
  {
    durable: true,
  },
);

const payForProduct = RabbitMq['default'].declareQueue(PAY_FOR_PRODUCT, {
  durable: true,
});

class QueueService {
  static createWallet(ownerId, wallet_type, CampaignId = null) {
    const payload = {wallet_type, ownerId, CampaignId};
    createWalletQueue.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }

  static createPayStack(id, amount) {
    const payload = {id, amount};
    payStackDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }
  static createCampaignPayStack(camp_id, camp_uuid, org_uuid, org_id, amount) {
    const payload = {camp_id, camp_uuid, org_uuid, org_id, amount};
    payStackCampaignDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }

  static verifyFiatDeposit(payload) {
    verifyFaitDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }

  static processOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    transaction,
  ) {
    const payload = {
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      order,
      vendor,
      amount,
      transaction,
    };
    processOrderQueue.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }

  static CampaignApproveAndFund(payload) {
    approveCampaignAndFund.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }

  static async FundBeneficiary(
    beneficiaryWallet,
    campaignWallet,
    task_assignment,
    amount_disburse,
  ) {
    const transaction = await Transaction.create({
      amount: amount_disburse,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      ReceiverWalletId: beneficiaryWallet.uuid,
      SenderWalletId: campaignWallet.uuid,
      BeneficiaryId: beneficiaryWallet.UserId,
      narration: 'for task completed by beneficiary',
      OrganisationId: campaignWallet.OrganisationId,
      is_approved: true,
    });

    const payload = {
      beneficiaryWallet,
      campaignWallet,
      task_assignment,
      amount_disburse,
      transaction,
    };
    fundBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
    return transaction;
  }

  static async fundBeneficiaryBankAccount(
    bankAccount,
    campaignWallet,
    userWallet,
    userId,
    amount,
  ) {
    const transaction = await Transaction.create({
      amount: amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'withdrawal',
      BeneficiaryId: userId,
      narration: 'Wallet withdrawal to bank account',
    });
    const payload = {
      bankAccount,
      campaignWallet,
      userWallet,
      userId,
      amount,
      transaction,
    };
    fundBeneficiaryBankAccount.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
    return transaction;
  }

  static async fundVendorBankAccount(bankAccount, userWallet, userId, amount) {
    const transaction = await Transaction.create({
      amount: amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'withdrawal',
      VendorId: userId,
      narration: 'Wallet withdrawal to bank account',
    });
    const payload = {bankAccount, userWallet, userId, amount, transaction};
    fundVendorBankAccount.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );

    return transaction;
  }

  static payForProduct(
    vendor,
    beneficiary,
    campaignWallet,
    VendorWallet,
    BenWallet,
    product,
  ) {
    const payload = {
      vendor,
      beneficiary,
      campaignWallet,
      VendorWallet,
      BenWallet,
      product,
    };
    payForProduct.send(
      new Message(payload, {
        contentType: 'application/json',
      }),
    );
  }
}

module.exports = QueueService;
