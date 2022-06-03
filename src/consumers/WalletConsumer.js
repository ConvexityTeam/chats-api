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
          cosole.log(token,'token')
          Logger.info('Account wallet created', token)
          WalletService.updateOrCreate(content, {
            ...token,
            ...bantu
          });
          
        }).catch(error => {
          Logger.error('Error creating account wallet')
          console.log(error.message);
          createWalletQueue.delete()
          msg.nack();
        });
      })
      .then(_ => {
        msg.ack();
        console.log(`Running Consumer For Create Wallet.`)
      })
      .catch(error => {
        console.log(`Error Starting Create Wallet Consumer:`, error);
      })
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });

  