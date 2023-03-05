const {
  GenearteSMSToken,
  generateQrcodeURL,
  generateTransactionRef
} = require('../utils');
const {
  NFT_MINTING_LIMIT,
  DEPLOY_NFT_COLLECTION,
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  CONFIRM_AND_SEND_MINT_NFT,
  CONFIRM_AND_MINT_NFT,
  MINT_NFT,
  APPROVE_NFT,
  CONFIRM_AND_GENERATE_TOKEN,
  LOOP_ITEM_BENEFICIARY,
  TRANSFER_MINT_TO_VENDOR,
  CONFIRM_AND_PAY_VENDOR,
  FUN_NFT_CAMPAIGN,
  CONFIRM_AND_UPDATE_CAMPAIGN,
  DISBURSE_ITEM,
  CONFIRM_AND_DISBURSE_ITEM
} = require('../constants/queues.constant');
const {RabbitMq, Logger} = require('../libs');
const {
  BlockchainService,
  QueueService,
  CampaignService,
  WalletService,
  SmsService,
  OrganisationService
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

const deployNFTCollection = RabbitMq['default'].declareQueue(
  DEPLOY_NFT_COLLECTION,
  {
    durable: true,
    prefetch: 1
  }
);

const approveNFT = RabbitMq['default'].declareQueue(APPROVE_NFT, {
  durable: true,
  prefetch: 1
});

const nftMintingLimit = RabbitMq['default'].declareQueue(NFT_MINTING_LIMIT, {
  durable: true,
  prefetch: 1
});

const mintNFT = RabbitMq['default'].declareQueue(MINT_NFT, {
  durable: true,
  prefetch: 1
});

const confirmAndMLimit = RabbitMq['default'].declareQueue(
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  {
    durable: true,
    prefetch: 1
  }
);

const confirmAndSendMintNFT = RabbitMq['default'].declareQueue(
  CONFIRM_AND_SEND_MINT_NFT,
  {
    durable: true,
    prefetch: 1
  }
);

const confirmAndMintNFT = RabbitMq['default'].declareQueue(
  CONFIRM_AND_MINT_NFT,
  {
    durable: true,
    prefetch: 1
  }
);

const disburseItem = RabbitMq['default'].declareQueue(DISBURSE_ITEM, {
  durable: true,
  prefetch: 1
});

const confirmAndDisburseItem = RabbitMq['default'].declareQueue(
  CONFIRM_AND_DISBURSE_ITEM,
  {
    durable: true,
    prefetch: 1
  }
);

const confirmAndGenerateToken = RabbitMq['default'].declareQueue(
  CONFIRM_AND_GENERATE_TOKEN,
  {
    durable: true,
    prefetch: 1
  }
);

const loopItemBeneficiary = RabbitMq['default'].declareQueue(
  LOOP_ITEM_BENEFICIARY,
  {
    durable: true,
    prefetch: 1
  }
);

const transferMintToVendor = RabbitMq['default'].declareQueue(
  TRANSFER_MINT_TO_VENDOR,
  {
    durable: true,
    prefetch: 1
  }
);

const payVendor = RabbitMq['default'].declareQueue(CONFIRM_AND_PAY_VENDOR, {
  durable: true,
  prefetch: 1
});
//########################...UPDATING TRANSACTIONS...##########################

const update_transaction = async (args, uuid) => {
  const transaction = await Transaction.findOne({where: {uuid}});
  if (!transaction) return null;
  await transaction.update(args);
  return transaction;
};
const update_campaign = async (id, args) => {
  const campaign = await Campaign.findOne({where: {id}});
  if (!campaign) return null;
  await campaign.update(args);
  return campaign;
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
const deductMintingLimit = async (limit, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    minting_limit: Sequelize.literal(`minting_limit - ${limit}`)
  });
  Logger.info(`Minting Limit deducted with ${limit}`);
  return wallet;
};

const addTokenIds = async (tokenId, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});

  if (!wallet) return null;
  const ids = [...wallet.tokenIds, tokenId];
  let balance = ids.length;
  await wallet.update({
    was_funded: true,
    tokenIds: [...wallet.tokenIds, tokenId],
    balance
  });
  Logger.info(`NFT added with ${tokenId}`);
  return wallet;
};

const removeTokenIds = async (tokenId, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});

  if (!wallet) return null;
  // const ids = [...wallet.tokenIds]
  await wallet.update({
    was_funded: true,
    tokenIds: tokenId
  });
  Logger.info(`NFT added with ${tokenId}`);
  return wallet;
};

const deductWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    balance: Sequelize.literal(`balance - ${amount}`)
  });
  Logger.info(`Wallet amount deducted with ${amount}`);
  return wallet;
};

const addWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true,
    balance: amount
  });
  Logger.info(`Wallet amount added with ${amount}`);
  return wallet;
};
function divideNArray(arr, chunk) {
  const data = [];
  for (i = 0; i < arr.length; i += chunk) {
    let tempArray;
    tempArray = arr.slice(i, i + chunk);
    data.push(tempArray);
  }
  return data;
}

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    //STEP 01: DEPLOY NEW NFT COLLECTION
    deployNFTCollection
      .activateConsumer(async msg => {
        const {collection} = msg.getContent();
        const newCollection = await BlockchainService.createNFTCollection(
          collection.title,
          DEPLOY_NFT_COLLECTION,
          collection
        );

        if (!newCollection) {
          msg.nack();
          return;
        }
        await update_campaign(collection.id, {
          collection_hash: newCollection.ncollection
        });

        Logger.info('CONSUMER: DEPLOYED NEW NFT COLLECTION');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Deploying New NFT Collection');
      })
      .catch(error => {
        Logger.error(`Collection Consumer Error: ${JSON.stringify(error)}`);
      });
    //STEP 02: CONFIRM AND SET MINTING LIMIT
    confirmAndMLimit
      .activateConsumer(async msg => {
        const {collection, hash} = msg.getContent();

        const confirmTransaction = await BlockchainService.confirmNFTTransaction(
          hash
        );

        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        const contractIndex = await BlockchainService.getContractIndex(
          confirmTransaction
        );

        await QueueService.createMintingLimit(collection, contractIndex);
        Logger.info('CONSUMER: CONFIRM AND SET MINTING LIMIT');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Confirming and Setting Minting Limit');
      })
      .catch(error => {
        Logger.error(
          `Confirm MLimit Sent Consumer Error: ${JSON.stringify(error)}`
        );
      });

    //STEP 03: CREATE MINTING LIMIT
    nftMintingLimit
      .activateConsumer(async msg => {
        const {collection, contractIndex} = msg.getContent();
        const createdMintingLimit = await BlockchainService.createMintingLimit(
          collection.minting_limit,
          contractIndex
        );

        if (!createdMintingLimit) {
          msg.nack();
          return;
        }
        await QueueService.confirmAndSendMintNFT(
          createdMintingLimit.mlimit,
          collection,
          contractIndex
        );
        Logger.info('CONSUMER: CREATED MINTING LIMIT');
        msg.ack();
      })
      .then(() => {
        Logger.info(
          'Running Process For Sending Minting Limit to Be Confirmed'
        );
      })
      .catch(error => {
        Logger.error(`MLimit Set Consumer Error: ${JSON.stringify(error)}`);
      });
    // FUND CAMPAIGN CONSUMER
    confirmAndSendMintNFT
      .activateConsumer(async msg => {
        const {hash, collection, contractIndex} = msg.getContent();
        let length = collection.minting_limit;
        let tokenURI = [];
        const campaignKeyPair = await BlockchainService.setUserKeypair(
          `campaign_${collection.id}`
        );

        const confirmTransaction = await BlockchainService.confirmNFTTransaction(
          hash
        );

        const wallet = await CampaignService.getCampaignWallet(
          collection.id,
          collection.OrganisationId
        );
        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        if (!wallet.Wallet) {
          // await QueueService.createWallet(
          //   collection.OrganisationId,
          //   'organisation',
          //   collection.id
          // );
          msg.nack();
          return;
        }

        for (let i = 0; i < length; i++) {
          tokenURI.push(collection.title);
        }
        await QueueService.mintNFTFunc(
          collection,
          wallet.Wallet,
          collection.minting_limit,
          campaignKeyPair.address,
          contractIndex,
          tokenURI
        );
        await update_campaign(collection.id, {contractIndex});

        Logger.info('CONSUMER: MINTING LIMIT SENT');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Creating Minting Limit');
      })
      .catch(error => {
        Logger.error(
          `Confirm And Send MLimit Consumer Error: ${JSON.stringify(error)}`
        );
      });

    confirmAndMintNFT
      .activateConsumer(async msg => {
        const {collection, hash, transaction} = msg.getContent();
        const confirmTransaction = await BlockchainService.confirmNFTTransaction(
          hash
        );
        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        const campaignWallet = await WalletService.findCampainSingleWallet(
          collection.id
        );
        await update_transaction(
          {status: 'success', transaction_hash: hash, is_approved: true},
          transaction.uuid
        );
        await update_campaign(collection.id, {
          is_funded: true,
          is_processing: false
        });
        await addWalletAmount(collection.minting_limit, campaignWallet.uuid);
        Logger.info('CONSUMER: NFT MINTED');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Minting NFT');
      })
      .catch(error => {
        Logger.error(`Minting Consumer Error: ${JSON.stringify(error)}`);
      });
    mintNFT
      .activateConsumer(async msg => {
        const {
          collection,
          transaction,
          receiver,
          contractIndex,
          tokenURI
        } = msg.getContent();
        const createdMintingLimit = await BlockchainService.mintNFT(
          receiver,
          contractIndex,
          tokenURI
        );

        if (!createdMintingLimit) {
          msg.nack();
          return;
        }
        await QueueService.confirmAndMintNFT(
          collection,
          createdMintingLimit.nft,
          transaction
        );

        Logger.info('CONSUMER: NFT TO BE MINT SENT FOR MINTING LIMIT');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Sending NFT For Minting Limit');
      })
      .catch(error => {
        Logger.error(`Minting Limit Consumer Error: ${JSON.stringify(error)}`);
      });
    //############### DISBURSE I  ############################

    disburseItem
      .activateConsumer(async msg => {
        const {campaign, beneficiaries, token_type, tokenId} = msg.getContent();
        let tokenIds = tokenId;
        let data = [];

        for (let i = 1; i <= tokenIds; i++) {
          data.push(i);
        }
        for (let [index, beneficiary] of beneficiaries.entries()) {
          const confirmTransaction = await BlockchainService.confirmNFTTransaction(
            campaign.collection_hash
          );

          if (!confirmTransaction) {
            msg.nack();
            return;
          }
          const collectionAddress = await BlockchainService.getCollectionAddress(
            confirmTransaction
          );

          if (!collectionAddress) {
            msg.nack();
            return;
          }
          const length = campaign.minting_limit / beneficiaries.length;
          const array = divideNArray(data, length);

          let split = array[index];
          const OrgWallet = await WalletService.findMainOrganisationWallet(
            campaign.OrganisationId
          );

          await QueueService.loopBeneficiaryItem(
            campaign,
            OrgWallet,
            token_type,
            beneficiary,
            split,
            collectionAddress
          );
        }
        Logger.info('HASH FOR FUNDING BENEFICIARY SENT FOR CONFIRMATION');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Disbursing Item');
      })
      .catch(error => {
        Logger.error(`Disburse Item Consumer Error: ${JSON.stringify(error)}`);
      });

    loopItemBeneficiary
      .activateConsumer(async msg => {
        const {
          campaign,
          OrgWallet,
          token_type,
          beneficiary,
          tokenIds,
          collectionAddress
        } = msg.getContent();
        const beneficiaryAddress = await BlockchainService.setUserKeypair(
          `user_${beneficiary.UserId}campaign_${beneficiary.CampaignId}`
        );
        const campaignAddress = await BlockchainService.setUserKeypair(
          `campaign_${beneficiary.CampaignId}`
        );
        let wallet = beneficiary.User.Wallets[0];
        let uuid = wallet.uuid;
        let array = Object.values(tokenIds);
        let approveNFT;
        for (let i = 0; i < array.length; i++) {
          approveNFT = await Promise.all([
            BlockchainService.nftTransfer(
              campaignAddress.privateKey,
              campaignAddress.address,
              beneficiaryAddress.address,
              array[i],
              collectionAddress
            )
          ]);
        }
        await Promise.all(approveNFT);
        await QueueService.confirmFundNFTBeneficiaries(
          beneficiary,
          token_type,
          campaign,
          OrgWallet,
          uuid,
          approveNFT.transfer,
          array
        );
      })
      .then(() => {
        Logger.info('Running Process For Looping Item Beneficiary');
      })
      .catch(error => {
        Logger.error(
          `Looping Item Beneficiary Consumer Error: ${JSON.stringify(error)}`
        );
      });
    //############### CONFIRM TRANSACTION AND UPDATE DB  ############################

    confirmAndDisburseItem
      .activateConsumer(async msg => {
        const {
          beneficiary,
          token_type,
          campaign,
          OrgWallet,
          uuid,
          hash,
          tokenId
        } = msg.getContent();
        let is_token = false;
        let QrCode;
        const confirmTransaction = await BlockchainService.confirmNFTTransaction(
          hash,
          {beneficiary, token_type, campaign, OrgWallet, uuid, hash, tokenId},
          CONFIRM_AND_DISBURSE_ITEM
        );
        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        const transaction = await create_transaction(
          campaign.minting_limit,
          OrgWallet.uuid,
          uuid,
          {
            BeneficiaryId: beneficiary.User.id,
            OrganisationId: campaign.OrganisationId
          }
        );
        await update_transaction(
          {status: 'success', is_approved: true},
          transaction.uuid
        );
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
          amount: tokenId.length
        };
        if (token_type === 'papertoken') {
          QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
          is_token = true;
        } else if (token_type === 'smstoken') {
          SmsService.sendOtp(
            beneficiary.User.phone,
            `Hello ${
              beneficiary.User.first_name || beneficiary.User.last_name
                ? beneficiary.User.first_name + ' ' + beneficiary.User.last_name
                : ''
            } your convexity token is ${smsToken}, you are approved to spend ${
              tokenId.length
            }.`
          );
          is_token = true;
        }
        if (is_token) {
          await VoucherToken.create({
            organisationId: campaign.OrganisationId,
            beneficiaryId: beneficiary.User.id,
            campaignId: campaign.id,
            tokenType: token_type,
            token: token_type === 'papertoken' ? QrCode : smsToken,
            amount: tokenId.length
          });
          is_token = false;
        }

        await update_campaign(campaign.id, {
          status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
          is_funded: true,
          amount_disbursed: campaign.minting_limit
        });
        await addTokenIds(tokenId, uuid);
        Logger.info('ITEM DISBURSED CONFIRMED');
      })
      .then(() => {
        Logger.info('Running Process For Confirm Disbursing Item');
      })
      .catch(error => {
        Logger.error(
          `Confirm Disburse Item Consumer Error: ${JSON.stringify(error)}`
        );
      });
    transferMintToVendor
      .activateConsumer(async msg => {
        const {
          beneficiaryWallet,
          vendorWallet,
          campaignWallet,
          order,
          amount,
          transaction
        } = msg.getContent();
        const beneficiaryAddress = await BlockchainService.setUserKeypair(
          `user_${beneficiaryWallet.UserId}campaign_${campaignWallet.CampaignId}`
        );

        const campaign = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        const confirmTransaction = await BlockchainService.confirmNFTTransaction(
          campaign.collection_hash
        );

        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        const collectionAddress = await BlockchainService.getCollectionAddress(
          confirmTransaction
        );

        if (!collectionAddress) {
          msg.nack();
          return;
        }
        const spend = beneficiaryWallet.tokenIds[0];
        const approveNFT = await BlockchainService.nftTransfer(
          beneficiaryAddress.privateKey,
          beneficiaryAddress.address,
          vendorWallet.address,
          spend,
          collectionAddress
        );
        if (!approveNFT) {
          msg.nack();
          return;
        }
        const confirmTransfer = await BlockchainService.confirmNFTTransaction(
          approveNFT.transfer
        );
        if (!confirmTransfer) {
          msg.nack();
          return;
        }
        const remain = beneficiaryWallet.tokenIds.shift();
        await removeTokenIds(remain, beneficiaryWallet.uuid);
        await QueueService.VendorBurn(
          transaction,
          order,
          beneficiaryWallet,
          vendorWallet,
          campaignWallet,
          collectionAddress
        );
        Logger.info('NFT SENT FOR BURNING');
      })
      .then(() => {
        Logger.info('Running Process For Collection of Item');
      })
      .catch(error => {
        Logger.error(
          `Collection of Item Consumer Error: ${JSON.stringify(error)}`
        );
      });

    payVendor
      .activateConsumer(async msg => {
        const {
          transaction,
          order,
          beneficiaryWallet,
          vendorWallet,
          campaignWallet,
          collectionAddress
        } = msg.getContent();
        const spend = beneficiaryWallet.tokenIds[0];
        const remain = beneficiaryWallet.tokenIds.shift();
        const vendorAddress = await BlockchainService.setUserKeypair(
          `user_${vendorWallet.UserId}`
        );
        const burn = await BlockchainService.nftBurn(
          vendorAddress.privateKey,
          collectionAddress,
          spend
        );
        if (!burn) {
          msg.nack();
          return;
        }
        await update_transaction(
          {status: 'success', is_approved: true},
          transaction
        );
        await update_order(order.reference, {status: 'confirmed'});
        await removeTokenIds(remain, beneficiaryWallet.uuid);
        await deductMintingLimit(amount, campaignWallet.uuid);
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
      .then(() => {
        Logger.info('Running Process For NFT Confirmation to Pay Vendor');
      })
      .catch(error => {
        Logger.error(
          `NFT Confirmation to Pay Vendor Consumer Error: ${JSON.stringify(
            error
          )}`
        );
      });
  })

  .catch(error => {
    Logger.error(`RabbitMq Error: ${JSON.stringify(error)}`);
  });
