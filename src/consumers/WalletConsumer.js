const {
  BlockchainService,
  WalletService,
  BantuService
} = require('../services');
const { RabbitMq } = require('../libs')
const { CREATE_WALLET } = require('../constants').queuesConst;

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1,
});

RabbitMq['default']
  .completeConfiguration()
  .then(function () {
    createWalletQueue.activateConsumer(async msg => {
      const content = msg.getContent();
      BlockchainService.createAccountWallet()
        .then(({
          AccountCreated
        }) => {
          return WalletService.updateOrCreate(content, AccountCreated);
        })
        .then( wallet => {
          const data = BantuService.createPair();
          return wallet.update(data);
        })
        .then(_ => {
          msg.ack();
        })
        .catch(error => {
          console.log(error);
          msg.nack();
        });
    })
    .then(_ => {
      console.log(`Running Consumer For Create Wallet.`)
    })
    .catch(error => {
      console.log(`Error Starting Create Wallet Consumer:`, error);
    })
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });