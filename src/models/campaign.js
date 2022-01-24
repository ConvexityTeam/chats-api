"use strict";
const {
  Model
} = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Campaign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      Campaign.belongsToMany(models.User, {
        as: 'Beneficiaries',
        foreignKey: "CampaignId",
        through: models.Beneficiary,
        constraints: false,
      });

      Campaign.hasMany(models.Wallet, {
        as: 'BeneficiariesWallets',
        foreignKey: "CampaignId",
        scope: {
          wallet_type: 'user'
        }
      });
      Campaign.hasOne(models.Wallet, {
        as: 'Wallets',
        foreignKey: "CampaignId",
        scope: {
          wallet_type: 'organisation'
        },
      });
      Campaign.hasMany(models.Task, {
        as: "Jobs"
      });
      Campaign.hasMany(models.Complaint, {
        as: 'Complaints',
        foreignKey: "CampaignId"
      })
      Campaign.belongsTo(models.Organisation, {
        foreignKey: "OrganisationId",
        as: "Organisation",
      });

      Campaign.hasMany(models.Product,{
        as: 'CampaignProducts'
      })
    }
  }

  Campaign.init({
    OrganisationId: DataTypes.INTEGER,
    title: DataTypes.STRING,
    type: DataTypes.ENUM("campaign", "cash-for-work"),
    spending: DataTypes.STRING,
    description: DataTypes.TEXT,
    status: DataTypes.ENUM('pending', 'active', 'paused', 'completed'),
    is_funded: DataTypes.BOOLEAN,
    funded_with: DataTypes.STRING,
    budget: DataTypes.FLOAT,
    amount_disbursed: DataTypes.FLOAT,
    location: DataTypes.STRING,
    start_date: DataTypes.DATE,
    paused_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
  }, {
    sequelize,
    modelName: "Campaign",
  });
  return Campaign;
};