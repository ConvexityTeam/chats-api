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
      SenderWalletId: beneficiaryWallet.uuid,
      OrderId: order.id,
      VendorId: vendor.id,
      BeneficiaryId: beneficiaryWallet.UserId,
      narration: 'Vendor Order'
    });

    QueueService.processOrder(
     beneficiaryWallet,vendorWallet,campaignWallet, order, vendor, amount
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
                    include: ['Product']
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
                    where: query ? {
                      [Op.or]: {
                        first_name: {
                          [Op.like]: `%${query}%`
                        },
                        last_name: {
                          [Op.like]: `%${query}%`
                        }
                      }
                    }  : { 
                      
                    },
                    attributes: userConst.publicAttr,
                    include: ['Store'],
                    
                },
              
                {
                    model: OrderProduct,
                    as: 'Cart',
                    
                    include: [{model: Product, as: 'Product', where: query ? {tag: {[Op.like]: `%${query}%`}}: {}}],
                    
                }
            ],
        });


        
        return product
       
}

}
module.exports = OrderService;