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
      Products.belongsTo(models.Market, { foreignKey: 'MarketId', as: 'Vendor' });
      Products.belongsTo(models.Campaign, { foreignKey: 'CampaignId', as: 'Campaign' });
    }
  };
  Products.init({
    type: DataTypes.ENUM("product", "service"),
    tag: DataTypes.STRING,
    cost: DataTypes.FLOAT,
    MarketId: DataTypes.INTEGER,
    CampaignId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Products',
  });
  return Products;
};