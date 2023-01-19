const {BlockchainService, WalletService} = require('../services');
const {RabbitMq, Logger} = require('../libs');
const {CREATE_WALLET} = require('../constants').queuesConst;

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1
});

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    createWalletQueue
      .activateConsumer(async msg => {
        const content = msg.getContent();
        const token = await BlockchainService.addUser(
          `${
            !content.CampaignId && content.wallet_type == 'user'
              ? 'user_' + content.ownerId
              : content.CampaignId && content.wallet_type == 'user'
              ? `user_${content.ownerId}campaign_${content.CampaignId}`
              : !content.CampaignId && content.wallet_type == 'organisation'
              ? 'organisation_' + content.ownerId
              : content.CampaignId &&
                content.wallet_type == 'organisation' &&
                'campaign_' + content.CampaignId
          }`
        );
        const confirm = await BlockchainService.confirmTransaction(
          token.data.AddedUser
        );

        if (confirm) {
          await WalletService.updateOrCreate(content, {
            address: token.keyPair.address
          });
          Logger.info('Account Wallet Created');
          msg.ack();
        } else {
          Logger.error(
            `Error Creating Account Wallet: ${JSON.stringify(token)}`
          );
          ///await createWalletQueue.delete();
          msg.nack();
        }
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
      })
      .then(() => {
        Logger.info(`Running Process For Wallet Creation`);
      });
  })
  .catch(error => {
    Logger.error(`RabbitMq Error: ${error}`);
  });
