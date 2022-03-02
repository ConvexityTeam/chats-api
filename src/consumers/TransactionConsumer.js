const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  TRANSFER_TO,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_WITHDRAW,
  PAYSTACK_DEPOSIT
} = require('../constants/queues.constant')
const {
  RabbitMq
} = require('../libs');
const {
  WalletService,
  QueueService,
  BlockchainService,
  DepositService,
  PaystackService
} = require('../services');

const {
  Sequelize,
  Transaction,
  Wallet,
  BankAccount,
  Campaign
} = require('../models');
const {
  generateTransactionRef
} = require('../utils');

const verifyFiatDepsoitQueue = RabbitMq['default'].declareQueue(VERIFY_FIAT_DEPOSIT, {
  durable: true,
  prefetch: 1
});



const processVendorOrderQueue = RabbitMq['default'].declareQueue(PROCESS_VENDOR_ORDER, {
  durable: true,
  prefetch: 1
});

const processCampaignFund = RabbitMq['default'].declareQueue(FROM_NGO_TO_CAMPAIGN, {
  durable: true,
  prefetch: 1
});


const processPaystack = RabbitMq['default'].declareQueue(PAYSTACK_DEPOSIT, {
  durable: true,
  prefetch: 1
});

const processPaystackWithdrawal = RabbitMq['default'].declareQueue(PAYSTACK_WITHDRAW, {
  durable: true,
  prefetch: 1
});

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    verifyFiatDepsoitQueue.activateConsumer(async msg => {
        const {
          transactionReference,
          OrganisationId,
          approved,
          status,
          amount
        } = msg.getContent();
        if (approved && status != 'successful' && status != 'declined') {
          WalletService.findMainOrganisationWallet(OrganisationId)
            .then(async wallet => {

              if (wallet) {
                const reference = generateTransactionRef();
                const mint = await BlockchainService.mintToken(wallet.address, amount);
                await DepositService.updateFiatDeposit(transactionReference, {status: 'successful'});
                await Transaction.create({
                  log: transactionReference,
                  narration: 'Fiat Deposit Transaction',
                  ReceiverWalletId: wallet.uuid,
                  transaction_origin: 'wallet',
                  transaction_type: 'deposit',
                  status: 'success',
                  is_approved: true,
                  OrganisationId,
                  reference,
                  amount
                });

                await wallet.update({
                  balance: Sequelize.literal(`balance + ${amount}`),
                  fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
                });
                msg.ack();
              } else {
                QueueService.createWallet(OrganisationId, 'organisation');
                Promise.reject('Organisation wallet does not exist');
              }
            })
            .catch(error => {
              console.log(error.message, '....///.....');
              // msg.nack();
              msg.ack();
            })
        }
     
     
      })
      .then(_ => {
        console.log(`Running Consumer For Verify Fiat Deposit.`)
      });

      processCampaignFund.activateConsumer(async msg =>{
        const {
          OrgWallet,
          campaignWallet,
          beneficiaries,
          campaign
        } = msg.getContent();
        if((Math.sign(OrgWallet.balance - campaign.budget) == -1 ) || (Math.sign(OrgWallet.balance - campaign.budget) == -0)){

          console.log('Insufficient wallet balance. Please fund organisation wallet.')
        }else{
   const org = await   BlockchainService.transferTo(OrgWallet.address, OrgWallet.privateKey, campaignWallet.address, campaign.budget);
   console.log(org, 'orgWallet')   
   await Campaign.update({
            status: 'ongoing',
            is_funded: true,
            amount_disbursed: campaign.budget
          },{where: {id: campaign.id}});

       const wal =   await Wallet.update({
            balance: Sequelize.literal(`balance - ${campaign.budget}`)
          }, {
            where: {
            uuid: OrgWallet.uuid
            }
          });
         await Transaction.create({
            amount: campaign.budget,
            reference: generateTransactionRef(),
            status: 'success',
            transaction_origin: 'wallet',
            transaction_type: 'transfer',
            SenderWalletId: OrgWallet.uuid,
            ReceiverWalletId: campaignWallet.uuid,
            OrganisationId: campaign.OrganisationId,
            narration: 'Approve Campaign Funding'
          });
          
          const wallet = beneficiaries.map((user)=> user.User.Wallets)
          const mergeWallet = [].concat.apply([], wallet);
          
          const budget = Number(campaign.budget) / beneficiaries.length
          mergeWallet.map(async(wal)=> {    
            const uuid =   wal.uuid
           const address = wal.address
           await  Wallet.update({
            balance: Sequelize.literal(`balance + ${budget}`)
          },{where: {uuid}})
         const  ben =  await  BlockchainService.approveToSpend(OrgWallet.address, OrgWallet.privateKey,address, Number(budget) )
        
      })
      msg.ack()
    }
      
    }).catch(error => {
              console.log(error.message, '....///.....');
              // msg.nack();
            })
      processPaystack.activateConsumer(async(msg) => {

        const {address, amount} = msg.getContent();

        BlockchainService.mintToken(address, amount).then(()=> {
          
        
          
        }).catch(()=> {
          
          
        })
      })

    // processPaystackWithdrawal.activateConsumer(async(msg)=> {

    //   const {address, amount} = msg.getContent();

    //     BlockchainService.mintToken(address, amount).then(()=> {
          
    //     const account = await BankAccount.findOne({where: UserId})
    //     if(account){
    //       PaystackService.withdraw({
    //         type: 'nuban',
    //         name,
    //         account_number,
    //         bank_code,
            
    //       })
    //     }
          
    //     }).catch(()=> {
          
          
    //     })
      
    // })
    processVendorOrderQueue.activateConsumer(async msg => {
        const content = msg.getContent();
        console.log(content)
      })
      .then(_ => {
        console.log(`Running Process Vendor Order Queue`)
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });

