'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class StoreTransaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      StoreTransaction.hasOne(models.Transaction, {
        foreignKey: 'WalletTxId',
        as: 'WalletTransaction'
      });
      StoreTransaction.belongsTo(models.User, { foreignKey: 'VendorId', as: 'Vendor'});
      StoreTransaction.belongsTo(models.User, { foreignKey: 'BeneficiaryId', as: 'Beneficiary'});
      StoreTransaction.belongsTo(models.Order, { foreignKey: 'OrderId', as: 'Order'})
    }
  };
  StoreTransaction.init({
    reference: DataTypes.STRING,
    amount: DataTypes.FLOAT,
    WalletTxId: DataTypes.UUID,
    OrderId: DataTypes.INTEGER,
    VendorId: DataTypes.INTEGER,
    BeneficiaryId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'StoreTransaction',
  });
  return StoreTransaction;
};