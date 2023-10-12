const { BlockchainService, WalletService, QueueService } = require('../services');
const { RabbitMq, Logger } = require('../libs');
const { CREATE_WALLET, CONFIRM_AND_CREATE_WALLET } = require('../constants').queuesConst;

const createWalletQueue = RabbitMq.default.declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1,
});

const confirmAndCreateWalletQueue = RabbitMq.default.declareQueue(
  CONFIRM_AND_CREATE_WALLET,
  {
    durable: true,
    prefetch: 1,
  },
);

RabbitMq.default
  .completeConfiguration()
  .then(() => {
    createWalletQueue
      .activateConsumer(async (msg) => {
        const content = msg.getContent();
        let key;

        if (content.wallet_type === 'user') {
          key = !content.CampaignId
            ? `user_${content.ownerId}`
            : `user_${content.ownerId}campaign_${content.CampaignId}`;
        } else if (content.wallet_type === 'organisation') {
          key = !content.CampaignId
            ? `organisation_${content.ownerId}`
            : `campaign_${content.CampaignId}`;
        }

        const token = await BlockchainService.addUser(key, CREATE_WALLET, content);

        if (!token) {
          msg.nack();
          return;
        }

        await QueueService.confirmAndCreateWallet(content, token);
        msg.ack();
      })
      .catch((error) => {
        Logger.error(`Consumer Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Wallet Creation');
      });
  });

confirmAndCreateWalletQueue
  .activateConsumer(async (msg) => {
    const { content, keyPair } = msg.getContent();
    await WalletService.updateOrCreate(content, {
      address: keyPair.address,
    });
    Logger.info('Account Wallet Created');
    msg.ack();
  })
  .catch((error) => {
    Logger.error(`Consumer Error: ${error.message}`);
  })
  .then(() => {
    Logger.info('Running Process For Confirming Wallet Creation');
  })
  .catch((error) => {
    Logger.error(`RabbitMq Error: ${error}`);
  });
