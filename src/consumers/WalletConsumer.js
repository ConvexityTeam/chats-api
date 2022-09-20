const {BlockchainService, WalletService, BantuService} = require('../services');
const {RabbitMq, Logger} = require('../libs');
const {CREATE_WALLET} = require('../constants').queuesConst;

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1,
});

async function createWallet() {
  try {
    await RabbitMq['default'].completeConfiguration();
    Logger.info('creating account wallet');
    await createWalletQueue.activateConsumer(async msg => {
      const content = msg.getContent();

      const token = await BlockchainService.addUser(
        `${
          !content.CampaignId && content.wallet_type == 'user'
            ? 'user_' + content.ownerId
            : content.CampaignId && content.wallet_type == 'user' ? `user_${content.ownerId}campaign_${content.CampaignId}` 
            : !content.CampaignId && content.wallet_type == 'organisation'
            ? 'organisation_' + content.ownerId
            : content.CampaignId && content.wallet_type == 'organisation' && 'campaign_' + content.CampaignId
        }`,
      );
      if (token || !token) {
        await WalletService.updateOrCreate(content, {
          ...token,
        });
        Logger.info('Account wallet created');
        msg.ack();
      } else {
        Logger.error(`Error creating account wallet`);
        await createWalletQueue.delete();
        msg.nack();
      }
    });
  } catch (error) {
    Logger.error(`Error creating account wallet: ${error.message}`);
    await createWalletQueue.delete();
    //msg.nack();
  }
}

createWallet();
