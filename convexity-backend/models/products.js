'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Products extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Products.belongsTo(models.Market, { foreignKey: 'MarketId', as: 'Vendor' })
    }
  };
  Products.init({
    MarketId: DataTypes.STRING,
    name: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    price: DataTypes.FLOAT,
    value: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.price * this.quantity
      }
    }
  }, {
    sequelize,
    modelName: 'Products',
  });
  return Products;
};