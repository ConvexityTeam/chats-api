const {
  VERIFY_FIAT_DEPOSIT
} = require('../constants/queues.constant')
const {
  RabbitMq
} = require('../libs');
const {
  WalletService,
  QueueService,
  BlockchainService
} = require('../services');

const {Sequelize, Transaction } = require('../models');
const { generateTransactionRef } = require('../utils');

const verifyFiatDepsoitQueue = RabbitMq['default'].declareQueue(VERIFY_FIAT_DEPOSIT, {
  durable: true,
  prefetch: 1
});

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    verifyFiatDepsoitQueue.activateConsumer(async msg => {
        const {OrganisationId, approved, status, amount} = msg.getContent();
        if (approved && (status != 'successful' || status != 'declined')) {

          WalletService.findMainOrganisationWallet(OrganisationId)
            .then(async wallet => {
              if (wallet) {
                await BlockchainService.mintToken(wallet.address, amount);
                await wallet.update({
                  balance: Sequelize.literal(`balance + ${amount}`),
                  fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
                })
                return Promise.resolve(wallet);
              } else {
                QueueService.createWallet(OrganisationId, 'organisation');
                Promise.reject('Organisation wallet does not exist');
              }
            })
            .then(wallet => {
              const reference = generateTransactionRef()
              Transaction.create({
                narration: 'Fiat Deposit Transaction',
                ReceiverWalletId: wallet.id,
                transaction_origin: 'wallet',
                transaction_type: 'deposit',
                status: 'success',
                is_approved: true,
                OrganisationId,
                reference,
                amount
              });
              msg.ack();
            })
            .catch(error => {
              console.log(error);
              msg.nack();
            })
        }


      })
      .then(_ => {
        console.log(`Running Consumer For Verify Fiat Deposit.`)
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });