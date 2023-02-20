const {
  NFT_MINTING_LIMIT,
  DEPLOY_NFT_COLLECTION,
  APPROVE_NFT
} = require('../constants/queues.constant');
const {RabbitMq, Logger} = require('../libs');

const deployNFTCollection = RabbitMq['default'].declareQueue(
  DEPLOY_NFT_COLLECTION,
  {
    durable: true,
    prefetch: 1
  }
);

const nftMintingLimit = RabbitMq['default'].declareQueue(NFT_MINTING_LIMIT, {
  durable: true,
  prefetch: 1
});

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    deployNFTCollection
      .activateConsumer(msg => {
        const {} = msg.getContent();

        nftMintingLimit.activateConsumer(() => {});
      })
      .then(() => {
        Logger.info('Running Process For Deploying New NFT Collection');
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${JSON.stringify(error)}`);
      });
  })
  .catch(error => {
    Logger.error(`RabbitMq Error: ${JSON.stringify(error)}`);
  });
