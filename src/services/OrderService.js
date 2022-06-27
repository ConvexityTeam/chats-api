const {
  generateTransactionRef
} = require("../utils");
const {
  userConst,
  walletConst
} = require('../constants');
const {
  Transaction,
  Wallet,
  Sequelize,
  User,
  OrderProduct,
  Order,
  Product
} = require('../models');

const Op = Sequelize.Op;

const QueueService = require("./QueueService");
const { ProductService } = require(".");


class OrderService {
  static async processOrder(beneficiaryWallet,vendorWallet,campaignWallet, order, vendor, amount) {
    order.update({status: 'processing'});
    const transaction = await Transaction.create({
      amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'store',
      transaction_type: 'spent',
      SenderWalletId: campaignWallet.uuid,
      ReceiverWallet: vendorWallet.uuid,
      OrderId: order.id,
      VendorId: vendor.id,
      BeneficiaryId: beneficiaryWallet.UserId,
      narration: 'Vendor Order'
    });

    QueueService.processOrder(
     beneficiaryWallet,vendorWallet,campaignWallet, order, vendor, amount, transaction.uuid
    );
 
    // Queue for process
    return transaction;
  }

  static async productPurchased (){

  const gender = await Order.findAll({
        where: {status: 'confirmed'},
        include: [{
                    model: User,
                    as: 'Vendor',
                    attributes: userConst.publicAttr,
                    include: ['Store']
                },
                {
                    model: OrderProduct,
                    as: 'Cart',
                    include: [{model: Product, as: 'Product', include:[{model: User, as: 'ProductBeneficiaries', attributes: userConst.publicAttr}]}],

                }
            ],
        });

      
        return gender
       
}

static async productPurchasedBy (query){

  const product = await Order.findAll({
        where: {status: 'confirmed'},
        include: [{

                    model: User,
                    as: 'Vendor',
                    attributes: userConst.publicAttr,
                    include: ['Store'],
                  
                    
                },
              
                {
                    model: OrderProduct,
                    as: 'Cart',
                    
                    include: [{model: Product, as: 'Product', include:[{model: User, as: 'ProductBeneficiaries', attributes: userConst.publicAttr}]}],
                    
                }
            ],
        });


        
        return product
       
}

}
module.exports = OrderService;