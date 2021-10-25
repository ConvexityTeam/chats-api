'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Accounts extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Accounts.belongsTo(models.User,{foreignKey: 'UserId',as: "AccountHolder"})
      // define association here
    }
  };
  Accounts.init({
    UserId: DataTypes.STRING,
    account_number: DataTypes.INTEGER,
    bank_name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Accounts',
  });
  return Accounts;
};