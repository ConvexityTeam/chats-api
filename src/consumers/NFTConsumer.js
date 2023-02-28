const {
  NFT_MINTING_LIMIT,
  DEPLOY_NFT_COLLECTION,
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  CONFIRM_AND_SEND_MINT_NFT,
  CONFIRM_AND_MINT_NFT,
  MINT_NFT,
  APPROVE_NFT,
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
  WalletService
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

const addTokenIds = async (tokenId, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});

  if (!wallet) return null;
  // const ids = [...wallet.tokenIds]
  await wallet.update({
    was_funded: true,
    tokenIds: [...wallet.tokenIds, tokenId]
  });
  Logger.info(`NFT added with ${tokenId}`);
  return wallet;
};

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    //STEP 01: DEPLOY NEW NFT COLLECTION
    deployNFTCollection
      .activateConsumer(async msg => {
        const {collection} = msg.getContent();
        const newCollection = await BlockchainService.createNFTCollection(
          collection.title
        );

        if (!newCollection) {
          msg.nack();
          return;
        }
        // await QueueService.confirmAndSetMintingLimit(
        //   collection,
        //   newCollection.ncollection
        // );
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

        const tokenURI = JSON.stringify([
          {title: collection.title, description: collection.description}
        ]);
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
        await update_transaction(
          {status: 'success', transaction_hash: hash, is_approved: true},
          transaction.uuid
        );
        await update_campaign(collection.id, {
          is_funded: true,
          is_processing: false
        });
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
    //############################........BENEFICIARY............##################################
    disburseItem
      .activateConsumer(async msg => {
        const {campaign, beneficiaries, token_type, tokenId} = msg.getContent();
        let tokenIds = tokenId;
        for (let beneficiary of beneficiaries) {
          const beneficial = await BlockchainService.setUserKeypair(
            `user_${beneficiary.UserId}campaign_${beneficiary.CampaignId}`
          );
          const campaign = await BlockchainService.setUserKeypair(
            `campaign_${beneficiary.CampaignId}`
          );

          const uuid = beneficiary.User.Wallets[0].uuid;
          console.log(campaign.privateKey);
          for (let i = 1; i < tokenIds; i++) {
            const approveNFT = await BlockchainService.nftTransfer(
              campaign.privateKey,
              beneficial.address,
              i,
              campaign.contractIndex
            );

            await QueueService.confirmFundNFTBeneficiaries(
              uuid,
              approveNFT.approval,
              i
            );
          }
          Logger.info('HASH FOR FUNDING BENEFICIARY SENT FOR CONFIRMATION');
        }
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Disbursing Item');
      })
      .catch(error => {
        Logger.error(`Disburse Item Consumer Error: ${JSON.stringify(error)}`);
      });

    confirmAndDisburseItem
      .activateConsumer(async msg => {
        const {uuid, hash, tokenId} = msg.getContent();
        // const confirmTransaction = await BlockchainService.confirmTransaction(
        //   hash
        // );
        // if (!confirmTransaction) {
        //   msg.nack();
        //   return;
        // }
        console.log(uuid, tokenId, 'uuid, tokenId');
        Logger.info('ITEM DISBURSED CONFIRMED');
        //await addTokenIds(tokenId, uuid);
      })
      .then(() => {
        Logger.info('Running Process For Confirm Disbursing Item');
      })
      .catch(error => {
        Logger.error(
          `Confirm Disburse Item Consumer Error: ${JSON.stringify(error)}`
        );
      });
  })
  .catch(error => {
    Logger.error(`RabbitMq Error: ${JSON.stringify(error)}`);
  });
