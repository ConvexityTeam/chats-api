const {Message} = require('@droidsolutions-oss/amqp-ts');
const {Transaction} = require('../models');
const {RabbitMq, Logger} = require('../libs');
const {generateTransactionRef, AclRoles} = require('../utils');
const {
  CREATE_WALLET,
  NFT_MINTING_LIMIT,
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  FUND_BENEFICIARY,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_DEPOSIT,
  PAY_FOR_PRODUCT,
  DEPLOY_NFT_COLLECTION,
  TRANSFER_FROM_TO_BENEFICIARY,
  PAYSTACK_VENDOR_WITHDRAW,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_CAMPAIGN_DEPOSIT,
  FUND_BENEFICIARIES,
  LOOP_ITEM_BENEFICIARY,
  MINT_NFT,
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  CONFIRM_AND_SEND_MINT_NFT,
  CONFIRM_AND_MINT_NFT,
  FUN_NFT_CAMPAIGN,
  CONFIRM_AND_UPDATE_CAMPAIGN,
  CONFIRM_AND_CREATE_WALLET,
  DISBURSE_ITEM,
  CONFIRM_AND_DISBURSE_ITEM,
  TRANSFER_MINT_TO_VENDOR,
  CONFIRM_AND_PAY_VENDOR,
  CONFIRM_NGO_FUNDING
} = require('../constants/queues.constant');
const WalletService = require('./WalletService');

const fundBeneficiaries = RabbitMq['default'].declareQueue(FUND_BENEFICIARIES, {
  durable: true
});

const disburseItem = RabbitMq['default'].declareQueue(DISBURSE_ITEM, {
  durable: true
});
const confirmDisburseItem = RabbitMq['default'].declareQueue(
  CONFIRM_AND_DISBURSE_ITEM,
  {
    durable: true
  }
);
const fundBeneficiary = RabbitMq['default'].declareQueue(FUND_BENEFICIARY, {
  durable: true
});
const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true
});
const payStackDepositQueue = RabbitMq['default'].declareQueue(
  PAYSTACK_DEPOSIT,
  {
    durable: true
  }
);

const payStackCampaignDepositQueue = RabbitMq['default'].declareQueue(
  PAYSTACK_CAMPAIGN_DEPOSIT,
  {
    durable: true
  }
);

const verifyFaitDepositQueue = RabbitMq['default'].declareQueue(
  VERIFY_FIAT_DEPOSIT,
  {
    durable: true
  }
);

const processOrderQueue = RabbitMq['default'].declareQueue(
  PROCESS_VENDOR_ORDER,
  {
    durable: true
  }
);

const funNFTCampaign = RabbitMq['default'].declareQueue(FUN_NFT_CAMPAIGN, {
  durable: true
});

const approveCampaignAndFund = RabbitMq['default'].declareQueue(
  FROM_NGO_TO_CAMPAIGN,
  {
    durable: true
  }
);

const fundVendorBankAccount = RabbitMq['default'].declareQueue(
  PAYSTACK_VENDOR_WITHDRAW,
  {
    durable: true
  }
);

const fundBeneficiaryBankAccount = RabbitMq['default'].declareQueue(
  PAYSTACK_BENEFICIARY_WITHDRAW,
  {
    durable: true
  }
);

const payForProduct = RabbitMq['default'].declareQueue(PAY_FOR_PRODUCT, {
  durable: true
});

const beneficiaryFundBeneficiary = RabbitMq['default'].declareQueue(
  TRANSFER_FROM_TO_BENEFICIARY,
  {
    durable: true
  }
);
const deployNewCollection = RabbitMq['default'].declareQueue(
  DEPLOY_NFT_COLLECTION,
  {
    durable: true
  }
);

const nftMintingLimit = RabbitMq['default'].declareQueue(NFT_MINTING_LIMIT, {
  durable: true
});

const confirmAndSetMLimit = RabbitMq['default'].declareQueue(
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  {
    durable: true
  }
);
const mintNFT = RabbitMq['default'].declareQueue(MINT_NFT, {
  durable: true
});

const confirmAndSendMintToken = RabbitMq['default'].declareQueue(
  CONFIRM_AND_SEND_MINT_NFT,
  {
    durable: true
  }
);

const confirmAndMintToken = RabbitMq['default'].declareQueue(
  CONFIRM_AND_MINT_NFT,
  {
    durable: true
  }
);

const confirmAndUpdateCampaign = RabbitMq['default'].declareQueue(
  CONFIRM_AND_UPDATE_CAMPAIGN,
  {
    durable: true
  }
);

const confirmAndCreateWalletQueue = RabbitMq['default'].declareQueue(
  CONFIRM_AND_CREATE_WALLET,
  {
    durable: true
  }
);
const loopItemBeneficiary = RabbitMq['default'].declareQueue(
  LOOP_ITEM_BENEFICIARY,
  {
    durable: true
  }
);

const processNFTOrderQueue = RabbitMq['default'].declareQueue(
  TRANSFER_MINT_TO_VENDOR,
  {
    durable: true
  }
);

const confirmAndPayVendor = RabbitMq['default'].declareQueue(
  CONFIRM_AND_PAY_VENDOR,
  {
    durable: true
  }
);
const confirmNgoFunding = RabbitMq['default'].declareQueue(
  CONFIRM_NGO_FUNDING,
  {
    durable: true
  }
);

class QueueService {
  static async confirmNGO_FUNDING(
    OrganisationId,
    hash,
    transactionId,
    transactionReference,
    amount
  ) {
    const payload = {
      OrganisationId,
      hash,
      transactionId,
      transactionReference,
      amount
    };
    confirmNgoFunding.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async VendorBurn(
    transaction,
    order,
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    collectionAddress
  ) {
    const payload = {
      transaction,
      order,
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      collectionAddress
    };
    confirmAndPayVendor.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async loopBeneficiaryItem(
    campaign,
    OrgWallet,
    token_type,
    beneficiary,
    tokenIds,
    collectionAddress
  ) {
    const payload = {
      campaign,
      OrgWallet,
      token_type,
      beneficiary,
      tokenIds,
      collectionAddress
    };
    loopItemBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async createCollection(collection) {
    const payload = {collection};
    deployNewCollection.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndSetMintingLimit(collection, hash) {
    const payload = {collection, hash};
    confirmAndSetMLimit.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndSendMintNFT(hash, collection, contractIndex) {
    const payload = {hash, collection, contractIndex};
    confirmAndSendMintToken.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmAndUpdateCampaign(
    OrgWallet,
    hash,
    campaign,
    transactionId
  ) {
    const payload = {OrgWallet, hash, campaign, transactionId};
    confirmAndUpdateCampaign.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndMintNFT(collection, hash, transaction) {
    const payload = {collection, hash, transaction};
    confirmAndMintToken.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async createMintingLimit(collection, contractIndex) {
    const payload = {collection, contractIndex};
    nftMintingLimit.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async mintNFTFunc(
    collection,
    wallet,
    amount,
    receiver,
    contractIndex,
    tokenURI
  ) {
    const transaction = await Transaction.create({
      narration: 'Minting Limit',
      ReceiverWalletId: wallet.uuid,
      transaction_origin: 'wallet',
      transaction_type: 'deposit',
      status: 'processing',
      is_approved: false,
      OrganisationId: wallet.OrganisationId,
      reference: generateTransactionRef(),
      amount
    });

    const payload = {
      collection,
      transaction,
      receiver,
      contractIndex,
      tokenURI
    };
    mintNFT.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async createWallet(ownerId, wallet_type, CampaignId = null) {
    const payload = {wallet_type, ownerId, CampaignId};
    createWalletQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndCreateWallet(content, hash) {
    const payload = {content, hash};
    confirmAndCreateWalletQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static createPayStack(id, amount) {
    const payload = {id, amount};
    payStackDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static createCampaignPayStack(camp_id, camp_uuid, org_uuid, org_id, amount) {
    const payload = {camp_id, camp_uuid, org_uuid, org_id, amount};
    payStackCampaignDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async verifyFiatDeposit({
    transactionReference,
    OrganisationId,
    approved,
    status,
    amount
  }) {
    const wallet = await WalletService.findMainOrganisationWallet(
      OrganisationId
    );
    if (!wallet) {
      await QueueService.createWallet(OrganisationId, 'organisation');
      return;
    }
    const transaction = await Transaction.create({
      log: transactionReference,
      narration: 'Fiat Deposit Transaction',
      ReceiverWalletId: wallet.uuid,
      transaction_origin: 'wallet',
      transaction_type: 'deposit',
      status: 'processing',
      is_approved: false,
      OrganisationId,
      reference: generateTransactionRef(),
      amount
    });
    const payload = {
      transactionId: transaction.uuid,
      transactionReference,
      OrganisationId,
      approved,
      status,
      amount,
      wallet
    };
    verifyFaitDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static processOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    transaction
  ) {
    const payload = {
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      order,
      vendor,
      amount,
      transaction
    };
    processOrderQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static processNFTOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    transaction
  ) {
    const payload = {
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      order,
      vendor,
      amount,
      transaction
    };
    processNFTOrderQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async fundBeneficiaries(
    OrgWallet,
    campaignWallet,
    beneficiaries,
    campaign,
    token_type
  ) {
    const payload = {
      OrgWallet,
      campaignWallet,
      beneficiaries,
      campaign,
      token_type
    };
    fundBeneficiaries.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async fundNFTBeneficiaries(
    campaign,
    beneficiaries,
    token_type,
    tokenId
  ) {
    const payload = {
      campaign,
      beneficiaries,
      token_type,
      tokenId
    };
    disburseItem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmFundNFTBeneficiaries(
    beneficiary,
    token_type,
    campaign,
    OrgWallet,
    uuid,
    hash,
    tokenId
  ) {
    const payload = {
      beneficiary,
      token_type,
      campaign,
      OrgWallet,
      uuid,
      hash,
      tokenId
    };
    confirmDisburseItem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async CampaignApproveAndFund(campaign, campaignWallet, OrgWallet) {
    const realBudget = campaign.budget;
    const transaction = await Transaction.create({
      amount: realBudget,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      SenderWalletId: OrgWallet.uuid,
      ReceiverWalletId: campaignWallet.uuid,
      OrganisationId: campaign.OrganisationId,
      narration: 'Approve Campaign Funding'
    });
    const payload = {
      OrgWallet,
      campaignWallet,
      campaign,
      transactionId: transaction.uuid,
      realBudget
    };
    approveCampaignAndFund.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }
  static async fundNFTCampaign(campaign, campaignWallet, OrgWallet) {
    const transaction = await Transaction.create({
      amount: campaign.minting_limit,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      SenderWalletId: OrgWallet.uuid,
      ReceiverWalletId: campaignWallet.uuid,
      OrganisationId: campaign.OrganisationId,
      narration: 'Approve Campaign Funding'
    });
    const payload = {
      OrgWallet,
      campaignWallet,
      campaign,
      transactionId: transaction.uuid
    };
    funNFTCampaign.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async BeneficiaryTransfer(
    senderWallet,
    receiverWallet,
    amount,
    campaignWallet
  ) {
    const transaction = await Transaction.create({
      amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      ReceiverWalletId: receiverWallet.uuid,
      SenderWalletId: senderWallet.uuid,
      narration: 'transfer between beneficiaries'
    });

    const payload = {
      senderWallet,
      receiverWallet,
      amount,
      transaction,
      campaignWallet
    };
    beneficiaryFundBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async FundBeneficiary(
    beneficiaryWallet,
    campaignWallet,
    task_assignment,
    amount_disburse
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
      is_approved: true
    });

    const payload = {
      beneficiaryWallet,
      campaignWallet,
      task_assignment,
      amount_disburse,
      transaction
    };
    fundBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async fundBeneficiaryBankAccount(
    bankAccount,
    campaignWallet,
    userWallet,
    userId,
    amount
  ) {
    const transaction = await Transaction.create({
      amount: amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'withdrawal',
      BeneficiaryId: userId,
      narration: 'Wallet withdrawal to bank account'
    });
    const payload = {
      bankAccount,
      campaignWallet,
      userWallet,
      userId,
      amount,
      transaction
    };
    fundBeneficiaryBankAccount.send(
      new Message(payload, {
        contentType: 'application/json'
      })
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
      narration: 'Wallet withdrawal to bank account'
    });
    const payload = {bankAccount, userWallet, userId, amount, transaction};
    fundVendorBankAccount.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );

    return transaction;
  }

  static payForProduct(
    vendor,
    beneficiary,
    campaignWallet,
    VendorWallet,
    BenWallet,
    product
  ) {
    const payload = {
      vendor,
      beneficiary,
      campaignWallet,
      VendorWallet,
      BenWallet,
      product
    };
    payForProduct.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
}

module.exports = QueueService;
