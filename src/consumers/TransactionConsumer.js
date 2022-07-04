const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  TRANSFER_TO,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_WITHDRAW,
  PAYSTACK_DEPOSIT,
  PAY_FOR_PRODUCT,
  FUND_BENEFICIARY,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW
} = require('../constants/queues.constant')
const {
  RabbitMq,
  Logger
} = require('../libs');
const {
  WalletService,
  QueueService,
  BlockchainService,
  DepositService,
  PaystackService,
  SmsService
} = require('../services');

const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  TaskAssignment,
  Order
} = require('../models');
const {
  GenearteSMSToken,
generateQrcodeURL,
  generateTransactionRef, AclRoles
} = require('../utils');

const verifyFiatDepsoitQueue = RabbitMq['default'].declareQueue(VERIFY_FIAT_DEPOSIT, {
  durable: true,
  prefetch: 1
});


const processFundBeneficiary = RabbitMq['default'].declareQueue(FUND_BENEFICIARY, {
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


const update_campaign = async(id, args)=> {
  await Campaign.update({
  ...args,
  },{where: {id}});                    
}

const update_transaction = async(args, uuid)=> {
await Transaction.update({
...args
},{where: {uuid}})
}
const deductWalletAmount = async(amount, uuid)=> {
    await Wallet.update({
    balance: Sequelize.literal(`balance - ${amount}`)
    },{where: {uuid}})       
}

const addWalletAmount = async(amount, uuid)=> {
    await Wallet.update({
    balance: Sequelize.literal(`balance + ${amount}`)
    },{where: {uuid}})       
}


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
          campaign, 
          token_type
        } = msg.getContent();
        if((Math.sign(OrgWallet.balance - campaign.budget) == -1 ) || (Math.sign(OrgWallet.balance - campaign.budget) == -0)){
          Logger.error('Insufficient wallet balance. Please fund organisation wallet.')
        }else{
          Logger.info('Transferring from organisation wallet to campaign wallet')
   const org = await   BlockchainService.transferTo(OrgWallet.address, OrgWallet.privateKey, campaignWallet.address, campaign.budget);  
   Logger.info('Transferred to campaign wallet', org);

   await update_campaign(campaign.id, 
    {status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
    is_funded: true,
    amount_disbursed: campaign.budget
  })

  await deductWalletAmount(campaign.budget, OrgWallet.uuid)
  await addWalletAmount(campaign.budget, campaign.Wallet.uuid)
            
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
          for(let i = 0; i<mergeWallet.length; i++){
            const uuid =   mergeWallet[i].uuid
           const address = mergeWallet[i].address
          await  BlockchainService.approveToSpend(campaign.Wallet.address, campaign.Wallet.privateKey,address, Number(budget) )
          await addWalletAmount(budget, uuid)  
          }        
          
    const User = beneficiaries.map((user)=> user.User)
          for(let i = 0; i<User.length; i++){
            let istoken = false
            let  QrCode;
            const smsToken = GenearteSMSToken()
            const qrCodeData = {
                OrganisationId: campaign.OrganisationId,
                Campaign: {id: campaign.id, title: campaign.title},
                Beneficiary: {id: User[i].id, name: User[i].first_name || User[i].last_name ?User[i].first_name  +" "+ User[i].last_name: ''},
                amount: budget
            }
            if(token_type === 'papertoken'){
             QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
            istoken = true

            }else if (token_type === 'smstoken') {
              SmsService.sendOtp(User[i].phone, `Hello ${User[i].first_name || User[i].last_name ?User[i].first_name  +" "+ User[i].last_name: ''} your convexity token is ${smsToken}, you are approved to spend ${budget}.`)
            istoken = true
            }
            if(istoken){
           await VoucherToken.create({
             organisationId: campaign.OrganisationId,
              beneficiaryId: User[i].id,
              campaignId: campaign.id,
              tokenType: token_type,
              token: token_type === 'papertoken' ? QrCode : smsToken,
              amount: budget
            })
            istoken = false
          }
          }
      msg.ack()
    } 
    }).catch(error => {
              console.log(error.message, '....///.....');
              // msg.nack();
            })
      processPaystack.activateConsumer(async(msg) => {

        const {address, amount} = msg.getContent();
       await  BlockchainService.mintToken(address, amount)    
        await Wallet.update({
            balance: Sequelize.literal(`balance + ${amount}`)
          }, {
            where: {
            address
            }})
          
        }).catch(()=> {
      })

    processBeneficiaryPaystackWithdrawal.activateConsumer(async(msg)=> {

      const {bankAccount, campaignWallet, userWallet, amount, transaction} = msg.getContent();
         await   BlockchainService.transferFrom(campaignWallet.address, userWallet.address,userWallet.address, userWallet.privateKey,  amount)
        await  BlockchainService.redeem(userWallet.address, userWallet.privateKey, amount)
        await PaystackService.withdraw("balance", amount, bankAccount.recipient_code, "spending") 
        await deductWalletAmount(amount, campaignWallet.uuid)
        await deductWalletAmount(amount, userWallet.uuid)
        await update_transaction({status: 'success'}, transaction.uuid)
        }).catch(()=> {
          console.log('RABBITMQ ERROR')
        })

        processVendorPaystackWithdrawal.activateConsumer(async msg => {
          const {bankAccount, userWallet, amount, transaction} = msg.getContent();
        await BlockchainService.redeem(userWallet.address, userWallet.privateKey, amount)
        await PaystackService.withdraw("balance", amount, bankAccount.recipient_code, "spending")
        await deductWalletAmount(amount, userWallet.uuid)
        await update_transaction({status: 'success'}, transaction.uuid)
        }).catch(error => {
          console.log('RABBITMQ ERROR', error)
        })

    processFundBeneficiary.activateConsumer(async msg => {
      const {beneficiaryWallet, campaignWallet, task_assignment, amount_disburse, transaction} = msg.getContent();
      await  BlockchainService.approveToSpend(campaignWallet.address, campaignWallet.privateKey,beneficiaryWallet.address, amount_disburse )
      await addWalletAmount(amount_disburse, beneficiaryWallet.uuid)  
      await deductWalletAmount(amount_disburse, campaignWallet.uuid)
      await update_transaction({status: 'success'}, transaction.uuid)
      await TaskAssignment.update({status: 'disbursed'},{where: {id: task_assignment.id}})
          
     msg.ack()
         }).catch((error)=>{
          console.log(error, 'error transfer')
         })
    
    
    processVendorOrderQueue.activateConsumer(async msg => {
        const {
      beneficiaryWallet,vendorWallet,campaignWallet, order, amount, transaction} = msg.getContent();
      await   BlockchainService.transferFrom(campaignWallet.address, vendorWallet.address,beneficiaryWallet.address, beneficiaryWallet.privateKey,  amount)

      Order.update({status: 'confirmed'},{where: { reference: order.reference} });
      
    await deductWalletAmount(amount, beneficiaryWallet.uuid)
    await deductWalletAmount(amount, campaignWallet.uuid)
    await addWalletAmount(amount, vendorWallet.uuid)
    await update_transaction({status: 'success'}, transaction)
        order.Cart.forEach(async(prod)=> {
        await ProductBeneficiary.create({
        productId: prod.ProductId,
        UserId: beneficiaryWallet.UserId,
        OrganisationId: campaignWallet.OrganisationId
      })
      })
            await VoucherToken.update({
              amount: Sequelize.literal(`balance - ${amount}`)
            },{where:{campaignId: campaignWallet.CampaignId, beneficiaryId: beneficiaryWallet.UserId}})
       
               })
               
               
      .then(_ => {
        console.log(`Running Process Vendor Order Queue`)
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error:`, error);
  });

