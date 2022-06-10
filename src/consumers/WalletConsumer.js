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

async function creatWallet(){
  
try {
  
   await RabbitMq['default'].completeConfiguration()
  Logger.info('creating account wallet')
  await createWalletQueue.activateConsumer(async(msg)=> {
    const content = msg.getContent();
const [token, bantu] = await Promise.all([
          BlockchainService.createAccountWallet(),
          BantuService.createPair()
        ])
        if(token){
          await WalletService.updateOrCreate(content, {
            ...token,
            ...bantu
          });
          Logger.info('Account wallet created')
          msg.ack();
        }else {
         Logger.error(`Error creating account wallet`)
         await createWalletQueue.delete() 
         msg.nack()
        }
 
     
  })
}catch(error){
  Logger.error(`Error creating account wallet: ${error.message}`)
         await createWalletQueue.delete()
          //msg.nack();
}
}
 
creatWallet()

    // createWalletQueue.activateConsumer(async msg => {
    //     const content = msg.getContent();
    //     Logger.info('creating account wallet')
    //     Promise.all([
    //       BlockchainService.createAccountWallet(),
    //       BantuService.createPair()
    //     ]).then(([token, bantu]) => {
    //       Logger.info('Account wallet created', token)
    //       WalletService.updateOrCreate(content, {
    //         ...token,
    //         ...bantu
    //       });
    //       msg.ack();
    //     }).catch(error => {
    //       Logger.error('Error creating account wallet', error.message)
    //       createWalletQueue.delete()
    //       msg.nack();
    //     });
    //   })
    //   .then(_ => {
    //     Logger.info('Running Consumer For Create Wallet.')
    //   })
    //   .catch(error => {
    //     Logger.error('Error Starting Create Wallet Consumer:', error)
    //   })

  