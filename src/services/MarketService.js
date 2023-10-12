const {
  Market,
  Product,
  OrderProduct,
  Organisation,
  User,
} = require('../models');

class MarketService {
  static findPurchasedProductByGender() {
    return Organisation.findAll({
      include: [
        {
          model: User,
          as: 'Vendors',

          include: [
            {
              model: Market,
              as: 'Store',

              include: [
                {
                  model: Product,
                  as: 'Products',

                  include: [
                    {
                      model: OrderProduct,
                      as: 'Product',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

module.exports = MarketService;
