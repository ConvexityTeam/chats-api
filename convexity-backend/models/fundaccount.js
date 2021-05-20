'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FundAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      FundAccount.belongsTo(models.Organisations, { foreignKey: "OrganisationId", as: "Minter" });
    }
  };
  FundAccount.init({
    channel: DataTypes.STRING,
    OrganisationId: DataTypes.INTEGER,
    amount: DataTypes.STRING,
    transactionReference: DataTypes.STRING,
    status: DataTypes.ENUM('processing', 'successful', 'declined')
  }, {
    sequelize,
    modelName: 'FundAccount',
  });
  return FundAccount;
};