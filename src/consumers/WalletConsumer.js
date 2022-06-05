const {
  BlockchainService,
  WalletService,
  BantuService
} = require('../services');
const {
  RabbitMq,
  Logger
} = require('../libs')
const {
  CREATE_WALLET
} = require('../constants').queuesConst;

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1,
  
});

RabbitMq['default']
  .completeConfiguration()
  .then(function () {
    createWalletQueue.activateConsumer(async msg => {
        const content = msg.getContent();
        Logger.info('creating account wallet')
        Promise.all([
          BlockchainService.createAccountWallet(),
          BantuService.createPair()
        ]).then(([token, bantu]) => {
          Logger.info('Account wallet created', token)
          WalletService.updateOrCreate(content, {
            ...token,
            ...bantu
          });
          msg.ack();
        }).catch(error => {
          Logger.error('Error creating account wallet', error.message)
          createWalletQueue.delete()
          msg.nack();
        });
      })
      .then(_ => {
        Logger.info('Running Consumer For Create Wallet.')
      })
      .catch(error => {
        Logger.error('Error Starting Create Wallet Consumer:', error)
      })
  })
  .catch(error => {
    Logger.error('ERabbitMq Error:', error)
  });

  