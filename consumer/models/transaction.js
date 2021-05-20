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
      Transaction.belongsTo(models.Wallet, { foreignKey: 'walletSenderId', as: 'SenderWallet' });
      Transaction.belongsTo(models.Wallet, { foreignKey: 'walletRecieverId', as: 'RecievingWallet' });
    }
  };
  Transaction.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    walletSenderId: DataTypes.UUID,
    walletRecieverId: DataTypes.UUID,
    TransactionalId: DataTypes.INTEGER,
    TransactionalType: DataTypes.STRING,
    transactionHash: DataTypes.STRING,
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
