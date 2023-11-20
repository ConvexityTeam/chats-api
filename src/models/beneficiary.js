'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Beneficiary extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Beneficiary.belongsTo(models.User, {
        foreignKey: 'UserId',
        as: 'User'
      });
      Beneficiary.belongsTo(models.Campaign, {
        foreignKey: 'CampaignId',
        as: 'Campaign'
      });
    }
  }
  Beneficiary.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      uuid: DataTypes.UUID,
      UserId: DataTypes.INTEGER,
      CampaignId: DataTypes.INTEGER,
      approved: DataTypes.BOOLEAN,
      approve_spending: DataTypes.BOOLEAN,
      status: DataTypes.ENUM(
        'pending',
        'in_progress',
        'processing',
        'success',
        'error'
      ),
      rejected: DataTypes.BOOLEAN,
      source: DataTypes.ENUM('beneficiary app', 'field app', 'web app')
    },
    {
      sequelize,
      modelName: 'Beneficiary'
    }
  );
  return Beneficiary;
};
