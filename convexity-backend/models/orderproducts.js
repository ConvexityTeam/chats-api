'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderProducts extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OrderProducts.belongsTo(models.Products, { as: 'Product', foreignKey: 'ProductId' })
      OrderProducts.belongsTo(models.Order, { as: 'Order', foreignKey: 'OrderId' })
    }
  };
  OrderProducts.init({
    OrderId: DataTypes.INTEGER,
    ProductId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    unit_price: DataTypes.FLOAT,
    total_amount: DataTypes.FLOAT,
  }, {
    sequelize,
    modelName: 'OrderProducts',
  });
  return OrderProducts;
};