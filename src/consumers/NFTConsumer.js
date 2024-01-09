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
  INCREASE_MINTING_GAS,
  DISBURSE_ITEM,
  CONFIRM_AND_DISBURSE_ITEM,
  INCREASE_GAS_APPROVE_SPENDING,
  INCREASE_GAS_FOR_NEW_COLLECTION,
  INCREASE_GAS_FOR_MINTING_LIMIT,
  INCREASE_GAS_MINT_NFT,
  APPROVE_NFT_SPENDING,
  INCREASE_GAS_NFT_TRANSFER
} = require('../constants/queues.constant');
const {RabbitMq, Logger} = require('../libs');
const {
  BlockchainService,
  QueueService,
  CampaignService,
  WalletService,
  SmsService,
  OrganisationService,
  BeneficiaryService
} = require('../services');
const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  Beneficiary,
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

const approveNFTSpending = RabbitMq['default'].declareQueue(
  APPROVE_NFT_SPENDING,
  {
    durable: true,
    prefetch: 1
  }
);

const increaseGasTransfer = RabbitMq['default'].declareQueue(
  INCREASE_GAS_NFT_TRANSFER,
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
const increaseGasNewCollection = RabbitMq['default'].declareQueue(
  INCREASE_GAS_FOR_NEW_COLLECTION,
  {
    durable: true,
    prefetch: 1
  }
);

const increaseForMintLimit = RabbitMq['default'].declareQueue(
  INCREASE_GAS_FOR_MINTING_LIMIT,
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

const increaseGasMintNFT = RabbitMq['default'].declareQueue(
  INCREASE_GAS_MINT_NFT,
  {
    durable: true,
    prefetch: 1
  }
);

const increaseGasApprove = RabbitMq['default'].declareQueue(
  INCREASE_GAS_APPROVE_SPENDING,
  {
    durable: true,
    prefetch: 1
  }
);
//########################...UPDATING TRANSACTIONS...##########################

const update_Voucher = async (args, amount) => {
  const voucher = await VoucherToken.findOne({where: {...args}});
  if (!voucher) return null;
  await voucher.update({
    amount: Sequelize.literal(`amount - ${amount}`)
  });
  Logger.info('Voucher updated');
  return voucher;
};

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

const addTokenIds = async (tokenId, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true,
    tokenIds: tokenId
  });
  Logger.info(`NFT added with ${tokenId}`);
  return wallet;
};

const removeTokenIds = async (tokenId, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true,
    tokenIds: tokenId
  });
  Logger.info(`NFT removed with ${tokenId}`);
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

const update_order = async (reference, args) => {
  const order = await Order.findOne({where: {reference}});
  if (!order) return null;
  await order.update(args);
  return order;
};

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    //STEP 01: DEPLOY NEW NFT COLLECTION
    deployNFTCollection
      .activateConsumer(async msg => {
        const {collection} = msg.getContent();
        const newCollection = await BlockchainService.createNFTCollection(
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
    increaseGasNewCollection
      .activateConsumer(async msg => {
        const {collection, keys} = msg.getContent();

        const gasFee = await BlockchainService.reRunContract(
          'deployNFTCollection',
          keys
        );

        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_campaign(collection.id, {
          collection_hash: gasFee.retried
        });
        Logger.info('Increased gas for creating new NFT collection');
      })
      .then(() => {
        Logger.info('Running Process For Deploying New NFT Collection');
      })
      .catch(error => {
        Logger.error(`Collection Consumer Error: ${JSON.stringify(error)}`);
      });
    confirmAndMLimit
      .activateConsumer(async msg => {
        const {collection, hash} = msg.getContent();

        const confirmTransaction = await BlockchainService.confirmTransaction(
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
          await update_campaign(collection.id, {
            fund_status: 'error'
          });
          return;
        }

        await QueueService.confirmAndSendMintNFT(
          createdMintingLimit.mlimit,
          collection,
          contractIndex
        );
        await update_campaign(collection.id, {
          fund_status: 'processing'
        });
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

    increaseForMintLimit
      .activateConsumer(async msg => {
        const {collection, keys, contractIndex} = msg.getContent();

        const gasFee = await BlockchainService.reRunContract(
          'mintingLimit',
          keys
        );

        if (!gasFee) {
          msg.nack();
          return;
        }
        await QueueService.confirmAndSendMintNFT(
          gasFee.retried,
          collection,
          contractIndex
        );
        Logger.info('Increased gas for creating Minting Limit');
      })
      .then(() => {
        Logger.info('Running Process For Deploying New NFT Collection');
      })
      .catch(error => {
        Logger.error(`Collection Consumer Error: ${JSON.stringify(error)}`);
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

        const confirmTransaction = await BlockchainService.confirmTransaction(
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
        await update_campaign(collection.id, {
          contractIndex,
          is_processing: true
        });

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
        const confirmTransaction = await BlockchainService.confirmTransaction(
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
          is_processing: false,
          fund_status: 'success'
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
        const {collection, transaction, receiver, contractIndex, tokenURI} =
          msg.getContent();
        const createdMintingLimit = await BlockchainService.mintNFT(
          receiver,
          contractIndex,
          tokenURI,
          {collection, transaction}
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
    increaseGasMintNFT
      .activateConsumer(async msg => {
        const {collection, transaction, keys} = msg.getContent();
        const gasFee = await BlockchainService.reRunContract('mintNFT', keys);

        if (!gasFee) {
          msg.nack();
          return;
        }
        await QueueService.confirmAndMintNFT(
          collection,
          gasFee.retried,
          transaction
        );
      })
      .then(() => {
        Logger.info('Running Process Increasing Gas For Minting NFT');
      })
      .catch(error => {
        Logger.error(`Minting Consumer Error: ${JSON.stringify(error)}`);
      });
    disburseItem
      .activateConsumer(async msg => {
        const {campaign, beneficiaries, token_type, tokenId} = msg.getContent();

        let tokenIds = tokenId;
        let data = [];
        for (let i = 1; i <= tokenIds; i++) {
          data.push(i);
        }
        for (let [index, beneficiary] of beneficiaries.entries()) {
          const confirmTransaction = await BlockchainService.confirmTransaction(
            campaign.collection_hash
          );

          if (!confirmTransaction) {
            msg.nack();
            return;
          }
          const collectionAddress =
            await BlockchainService.getCollectionAddress(confirmTransaction);
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
          let wallet = beneficiary.User.Wallets[0];
          let uuid = wallet.uuid;
          let arr = Object.values(split);
          const transaction = await create_transaction(
            campaign.minting_limit,
            OrgWallet.uuid,
            uuid,
            {
              BeneficiaryId: beneficiary.User.id,
              CampaignId: campaign.id
            }
          );
          await update_transaction(
            {status: 'success', is_approved: true},
            transaction.uuid
          );
          let is_token = false;
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
            amount: arr.length
          };
          if (token_type === 'papertoken') {
            QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
            is_token = true;
          } else if (token_type === 'smstoken') {
            SmsService.sendOtp(
              beneficiary.User.phone,
              `Hello ${
                beneficiary.User.first_name || beneficiary.User.last_name
                  ? beneficiary.User.first_name +
                    ' ' +
                    beneficiary.User.last_name
                  : ''
              } your convexity token is ${smsToken}, you are approved to spend ${
                arr.length
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
              amount: arr.length
            });
            is_token = false;
          }

          await addTokenIds(arr, uuid);
          await addWalletAmount(arr.length, uuid);
        }
        await update_campaign(campaign.id, {
          status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
          is_funded: true,
          amount_disbursed: campaign.minting_limit
        });
        Logger.info('HASH FOR FUNDING BENEFICIARY SENT FOR CONFIRMATION');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Disbursing Item');
      })
      .catch(error => {
        Logger.error(`Disburse Item Consumer Error: ${JSON.stringify(error)}`);
      });
    approveNFTSpending
      .activateConsumer(async msg => {
        const {beneficiaryId, campaignId, amount} = msg.getContent();

        const [beneficiaryAddress, campaignAddress, wallet, campaign] =
          await Promise.all([
            BlockchainService.setUserKeypair(
              `user_${beneficiaryId}campaign_${campaignId}`
            ),
            BlockchainService.setUserKeypair(`campaign_${campaignId}`),
            WalletService.findSingleWallet({
              CampaignId: campaignId,
              UserId: beneficiaryId
            }),
            CampaignService.getCampaignById(campaignId)
          ]);
        const confirmTransaction = await BlockchainService.confirmTransaction(
          campaign.collection_hash
        );
        console.log(campaignAddress, 'campaignAddress');
        console.log(beneficiaryAddress, 'beneficiaryAddress');
        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        const collectionAddress = await BlockchainService.getCollectionAddress(
          confirmTransaction
        );
        await BeneficiaryService.spendingStatus(campaignId, beneficiaryId, {
          status: 'processing'
        });
        const lastIndex = Object.values(wallet.tokenIds).length - 1;
        Logger.info(`lastIndex: ${lastIndex}`);
        const lastItem = Object.values(wallet.tokenIds)[lastIndex];
        Logger.info(`lastItem: ${lastItem}`);
        Logger.info(
          `compare: ${
            Object.values(wallet.tokenIds).indexOf(lastItem) === lastIndex
          }`
        );
        for (let i = 0; i < Object.values(wallet.tokenIds).length; i++) {
          const approve = await BlockchainService.createNFTApproveToSpend(
            campaignAddress.privateKey,
            beneficiaryAddress.address,
            wallet.tokenIds[i],
            collectionAddress,
            {
              lastItem:
                Object.values(wallet.tokenIds).indexOf(lastItem) === lastIndex
                  ? lastItem
                  : null,
              campaignId,
              beneficiaryId
            }
          );

          if (!approve) {
            msg.nack();
            return;
          }
        }
        await BeneficiaryService.spendingStatus(campaignId, beneficiaryId, {
          status: 'success'
        });

        Logger.info(`Approve Beneficiary NFT Spending`);
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Approving NFT Spending');
      })
      .catch(error => {
        Logger.error(`Disburse Item Consumer Error: ${JSON.stringify(error)}`);
      });
    increaseGasApprove.activateConsumer(async msg => {
      const {
        campaignPrivateKey,
        beneficiaryAddress,
        tokenId,
        collectionAddress,
        params
      } = msg.getContent();

      Logger.info(
        `campaignPrivateKey: ${campaignPrivateKey}, tokenId: ${tokenId}, collectionAddress: ${collectionAddress}, beneficiaryAddress: ${beneficiaryAddress},   params: ${JSON.stringify(
          params
        )}`
      );

      const gasFee = await BlockchainService.reRunContract('approve_', {
        password: campaignPrivateKey,
        receiver: beneficiaryAddress,
        tokenId,
        contractIndex: collectionAddress
      });

      if (!gasFee) {
        msg.nack();
        return;
      }
      params.lastItem &&
        (await BeneficiaryService.spendingStatus(
          params.campaignId,
          params.beneficiaryId,
          {
            status: 'success'
          }
        ));
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
        const vendorAddress = await BlockchainService.setUserKeypair(
          `user_${vendorWallet.UserId}`
        );

        const campaign = await CampaignService.getCampaignById(
          campaignWallet.CampaignId
        );

        const confirmTransaction = await BlockchainService.confirmTransaction(
          campaign.collection_hash
        );

        if (!confirmTransaction) {
          msg.nack();
          return;
        }
        const campaignKeyPair = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        const collectionAddress = await BlockchainService.getCollectionAddress(
          confirmTransaction
        );

        if (!collectionAddress) {
          msg.nack();
          return;
        }
        let approveNFT;
        let spend;
        let remain;
        let uuid = beneficiaryWallet.uuid;
        for (let i = 0; i < amount; i++) {
          spend = beneficiaryWallet.tokenIds[i];
          remain = beneficiaryWallet.tokenIds.slice(amount[i] + 1);
          approveNFT = await BlockchainService.nftTransfer(
            beneficiaryAddress.privateKey,
            campaignKeyPair.address,
            vendorWallet.address,
            spend,
            collectionAddress
          );
        }

        await BlockchainService.nftBurn(
          vendorAddress.privateKey,
          collectionAddress,
          spend
        );
        if (!approveNFT) {
          msg.nack();
          return;
        }

        order.Cart.forEach(async prod => {
          await ProductBeneficiary.create({
            productId: prod.ProductId,
            UserId: beneficiaryWallet.UserId,
            OrganisationId: campaignWallet.OrganisationId
          });
        });
        await update_transaction(
          {status: 'success', is_approved: true},
          transaction
        );

        const remainingNFT = beneficiaryWallet.tokenIds.slice(amount);
        const removedNFT = beneficiaryWallet.tokenIds.slice(0, amount);
        await update_order(order.reference, {status: 'confirmed'});
        await removeTokenIds(remainingNFT, uuid);
        const removedToken = [...vendorWallet.tokenIds, ...removedNFT];
        await deductWalletAmount(amount, uuid);
        await addWalletAmount(amount, vendorWallet.uuid);
        await addTokenIds(removedToken, vendorWallet.uuid);
        await update_Voucher(
          {
            campaignId: campaignWallet.CampaignId,
            beneficiaryId: beneficiaryWallet.UserId
          },
          amount
        );
        await deductWalletAmount(amount, campaignWallet.uuid);
        Logger.info('NFT  BURNED');
      })
      .then(() => {
        Logger.info('Running Process For Collection of Item');
      })
      .catch(error => {
        Logger.error(
          `Collection of Item Consumer Error: ${JSON.stringify(error)}`
        );
      });
    increaseGasTransfer.activateConsumer(async msg => {
      const {senderPrivateKey, sender, receiver, tokenId, collectionAddress} =
        msg.getContent();

      await BlockchainService.reRunContract('transferFrom_', {
        password: senderPrivateKey,
        sender: sender,
        receiver: receiver,
        amount: tokenId,
        contractIndex: collectionAddress
      });
    });
  })
  .then(() => {
    Logger.info('Running Process For NFT Transfer');
  })

  .catch(error => {
    Logger.error(`RabbitMq Error: ${JSON.stringify(error)}`);
  });
