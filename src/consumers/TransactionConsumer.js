const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  TRANSFER_TO,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_WITHDRAW,
  PAYSTACK_DEPOSIT,
  PAY_FOR_PRODUCT,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW
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
  Campaign,
  Order
} = require('../models');
const {
  generateTransactionRef, AclRoles
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

const processBeneficiaryPaystackWithdrawal = RabbitMq['default'].declareQueue(PAYSTACK_BENEFICIARY_WITHDRAW, {
  durable: true,
  prefetch: 1
});

const processVendorPaystackWithdrawal = RabbitMq['default'].declareQueue(PAYSTACK_VENDOR_WITHDRAW, {
  durable: true,
  prefetch: 1
});

const payForProduct = RabbitMq['default'].declareQueue(PAY_FOR_PRODUCT, {
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

   await Campaign.update({
            status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
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
            await Wallet.update({
            balance: Sequelize.literal(`balance + ${campaign.budget}`)
          }, {
            where: {
            uuid: campaign.Wallet.uuid
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
         const  ben =  await  BlockchainService.approveToSpend(campaign.Wallet.address, campaign.Wallet.privateKey,address, Number(budget) )
      
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

    processBeneficiaryPaystackWithdrawal.activateConsumer(async(msg)=> {

      const {bankAccount, campaignWallet, userWallet, userId, amount, transaction} = msg.getContent();

    const redeem =  await  BlockchainService.redeem(campaignWallet.address, campaignWallet.privateKey, amount)
    if(redeem){

         const ref =  await   BlockchainService.transferFrom(campaignWallet.address, userWallet.address,userWallet.address, userWallet.privateKey,  amount)
        
         if(ref){
        const pay =  await PaystackService.withdraw("balance", amount, bankAccount.recipient_code, "spending")    
        await Wallet.update({
           balance: Sequelize.literal(`balance - ${amount}`)
         },{where: {uuid: campaignWallet.uuid}})
         await Wallet.update({
           balance: Sequelize.literal(`balance - ${amount}`)
         },{where: {uuid: userWallet.uuid}})
         await Transaction.update({
           status: 'success'
          },{where: {uuid: transaction.uuid}})
        }
       
      
      }
    
       
        }).catch(()=> {
          console.log('RABBITMQ ERROR')
          
        })

        processVendorPaystackWithdrawal.activateConsumer(async msg => {
          const {bankAccount, userWallet, userId, amount, transaction} = msg.getContent();
        const redeem =   await BlockchainService.redeem(userWallet.address, userWallet.privateKey, amount)
        const withdraw = await PaystackService.withdraw("balance", amount, bankAccount.recipient_code, "spending")
        await Wallet.update({
           balance: Sequelize.literal(`balance - ${amount}`)
         },{where: {uuid: userWallet.uuid}})
         await Transaction.update({
           status: 'success'
          },{where: {uuid: transaction.uuid}})
        }).catch(error => {
          console.log('RABBITMQ ERROR', error)
        })

    payForProduct.activateConsumer(async msg => {
      const {vendor, beneficiary, campaignWallet, VendorWallet, BenWallet, product} = msg.getContent();
       await   BlockchainService.transferFrom(campaignWallet.address, VendorWallet.address,BenWallet.address, BenWallet.privateKey,  product.cost).then(async()=> {

        await  Wallet.update({
            balance: Sequelize.literal(`balance - ${product.cost}`)
          },{where: {uuid: BenWallet.uuid} })

          await  Wallet.update({
            balance: Sequelize.literal(`balance + ${product.cost}`)
          },{where: {uuid: VendorWallet.uuid} });
          
          await  Wallet.update({
            balance: Sequelize.literal(`balance - ${product.cost}`)
          },{where: {uuid: campaignWallet.uuid} })

          await Transaction.create({
            amount: product.cost,
            reference: generateTransactionRef(),
            status: 'success',
            transaction_origin: 'wallet',
            transaction_type: 'transfer',
            SenderWalletId: BenWallet.uuid,
            ReceiverWalletId: VendorWallet.uuid,
            BeneficiaryId: beneficiary.id,
            VendorId: vendor.id,
            narration: `${product.tag}`
          });
          msg.ack()
         }).catch((error)=>{
          console.log(error, 'error transfer')
         })
    }).catch((error)=>{
      console.log(`RabbitMq Error:`, error);
    })

    
    processVendorOrderQueue.activateConsumer(async msg => {
        const {
      beneficiaryWallet,vendorWallet,campaignWallet, order, vendor, amount} = msg.getContent();
         const ref =  await   BlockchainService.transferFrom(campaignWallet.address, vendorWallet.address,beneficiaryWallet.address, beneficiaryWallet.privateKey,  amount)

      Order.update({status: 'confirmed'},{where: { reference: order.reference} });

    await  Wallet.update({
            balance: Sequelize.literal(`balance - ${amount}`)
          },{where: {uuid: beneficiaryWallet.uuid} })

          await  Wallet.update({
            balance: Sequelize.literal(`balance + ${amount}`)
          },{where: {uuid: vendorWallet.uuid} })


          await  Wallet.update({
            balance: Sequelize.literal(`balance - ${amount}`)
          },{where: {uuid: campaignWallet.uuid} })
                
               })
      .then(_ => {
        console.log(`Running Process Vendor Order Queue`)
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });

