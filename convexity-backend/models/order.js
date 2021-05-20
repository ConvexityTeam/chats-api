'use strict';
const {
  Model
} = require('sequelize');
const db = require("./index")
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Order.hasMany(models.Transaction, {
        as: 'Transaction', foreignKey: 'TransactionalId',
        constraints: false,
        scope: {
          TransactionalType: 'order'
        }
      });
      Order.hasMany(models.OrderProducts, { as: 'Cart' })
      Order.belongsTo(models.User, { as: 'UserOrder', foreignKey: 'UserId' })
    }
  };
  Order.init({
    OrderUniqueId: {
      type: DataTypes.STRING,
    },
    UserId: DataTypes.INTEGER,
    status: DataTypes.ENUM('pending', 'processing', 'confirmed', 'delivered'),

  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};