'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Market extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      //Market.hasMany(models.Product, { foreignKey: 'MarketId', as: 'Products' })
      Market.belongsTo(models.User, {foreignKey: 'UserId', as: 'StoreOwner'});
    }
  }
  Market.init(
    {
      UserId: DataTypes.STRING,
      store_name: DataTypes.STRING,
      address: DataTypes.STRING,
      location: DataTypes.JSON,
      category_id: DataTypes.INTEGER,
      website_url: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Market'
    }
  );
  return Market;
};
