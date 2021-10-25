'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Transaction.belongsTo(models.Wallet, {
        foreignKey: 'SenderWalletId',
        as: 'SenderWallet'
      });

      Transaction.belongsTo(models.Wallet, {
        foreignKey: 'ReceiverWalletId',
        as: 'ReceiverWallet'
      });

      Transaction.belongsTo(models.User, {
        foreignKey: 'OrganisationId',
        as: 'Organisations'
      });

      Transaction.belongsTo(models.Order, {
        foreignKey: 'OrderId',
        as: 'Order'
      });

      Transaction.belongsTo(models.User, {
        foreignKey: 'BeneficiaryId',
        as: 'Beneficiary',
        scope: {
          transaction_type: 'order'
        }
      });

      Transaction.belongsTo(models.User, {
        foreignKey: 'VendorId',
        as: 'Vendor'
      });
    }
  };
  Transaction.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reference: DataTypes.STRING,
    SenderWalletId: DataTypes.UUID,
    ReceiverWalletId: DataTypes.UUID,
    OrderId: DataTypes.INTEGER,
    VendorId: DataTypes.INTEGER,
    BeneficiaryId: DataTypes.INTEGER,
    OrganisationId: DataTypes.INTEGER,
    transaction_type: DataTypes.ENUM('deposit', 'order', 'withdrawal', 'transfer', 'approval', 'spent'),
    transaction_origin: DataTypes.ENUM('store', 'wallet'),
    transaction_hash: DataTypes.STRING,
    amount: DataTypes.FLOAT,
    status: DataTypes.ENUM('success', 'processing', 'declined'),
    is_approved: DataTypes.BOOLEAN,
    narration: DataTypes.STRING,
    log: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Transaction',
  });
  return Transaction;
};