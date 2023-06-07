const {RabbitMq, Logger} = require('../libs');
const {
  WITHHELD_FUND,
  CONFIRM_WITHHOLDING_FUND,
  WITHHOLD_FUND_GAS_ERROR
} = require('../constants/queues.constant');
const {BlockchainService, QueueService} = require('../services');
const ConsumerFunction = require('../utils/consumerFunctions');

//Donor/NGO to withheld fund if don't want to donate again
const withHoldFund = RabbitMq['default'].declareQueue(WITHHELD_FUND, {
  durable: true,
  prefetch: 1
});

//Confirm Donor/NGO to withheld fund if don't want to donate again
const confirmHoldFund = RabbitMq['default'].declareQueue(
  CONFIRM_WITHHOLDING_FUND,
  {
    durable: true,
    prefetch: 1
  }
);
//Increase Gas for Donor/NGO to withheld fund if don't want to donate again
const increaseGasHoldFund = RabbitMq['default'].declareQueue(
  WITHHOLD_FUND_GAS_ERROR,
  {
    durable: true,
    prefetch: 1
  }
);
//Consumers
RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    //consumer for withholding funds
    withHoldFund
      .activateConsumer(async msg => {
        const {
          campaign_id,
          organisation_id,
          transactionId,
          amount
        } = msg.getContent();
        const organizationKeys = await BlockchainService.setUserKeypair(
          `organisation_${organisation_id}`
        );
        const campaignKeys = await BlockchainService.setUserKeypair(
          `campaign_${campaign_id}`
        );
        Logger.info('Process 1');
        const transfer = await BlockchainService.transferTo(
          campaignKeys.privateKey,
          organizationKeys.address,
          amount,
          {
            transactionId,
            campaign_id,
            organisation_id,
            amount
          },
          'withHoldFunds'
        );
        Logger.info('Process 2');
        if (!transfer) {
          msg.nack();
          return;
        }
        Logger.info('Process 3');
        await ConsumerFunction.update_transaction(
          {
            transaction_hash: transfer.Transfered
          },
          transactionId
        );
        Logger.info('Process' + transfer.Transfered);
        await QueueService.confirmWithHoldFunds({
          transactionId,
          transaction_hash: transfer.Transfered,
          campaign_id,
          organisation_id,
          amount
        });
      })
      .then(() => {
        Logger.info('Running consumer for withholding funds');
      })
      .catch(error => {
        Logger.error(`Error withholding funds: ${error}`);
      });

    //confirm if transaction has been mined on the blockchain
    confirmHoldFund
      .activateConsumer(async msg => {
        const {transactionId, transaction_hash, campaign_id} = msg.getContent();

        const confirmed = await BlockchainService.confirmTransaction(
          transaction_hash
        );

        if (!confirmed) {
          msg.nack();
          return;
        }
        await update_campaign(campaign_id, {
          is_funded: false,
          is_processing: false,
          budget: 0
        });
        await update_transaction(
          {
            status: 'success',
            is_approved: true
          },
          transactionId
        );
      })
      .then(() => {
        Logger.info('Running consumer for confirming withholding funds');
      })
      .catch(error => {
        Logger.error(`Error confirming withholding funds: ${error}`);
      });
    // Increase gas if finished while withholding funds
    increaseGasHoldFund
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();

        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transfer',
          keys
        );

        if (!gasFee) {
          msg.nack();
          return;
        }
        await ConsumerFunction.update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.confirmWithHoldFunds({
          ...message,
          transaction_hash: gasFee.retried
        });
      })
      .then(() => {
        Logger.info(
          'Running consumer for increasing gas for withholding funds'
        );
      })
      .catch(error => {
        Logger.error(`Error increasing gas for withholding funds: ${error}`);
      });
  })
  .then(() => {
    Logger.info(`Organization consumer running`);
  })
  .catch(error => {
    Logger.error(`Organization consumer error: ${error}`);
  });
