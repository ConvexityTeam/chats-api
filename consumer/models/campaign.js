"use strict";
const { Model } = require("sequelize");
const db = require(".");
module.exports = (sequelize, DataTypes) => {
  class Campaign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Campaign.hasOne(models.Transaction, {
        as: "CampaignWallet",
        foreignKey: "CampaignId",
        scope: {
          wallet_type: "campaign",
        },
      });
      Campaign.hasMany(models.Beneficiaries, { as: "Beneficiaries" });
      Campaign.hasMany(models.Tasks, { as: "Jobs" });

      Campaign.belongsTo(models.Organisations, {
        foreignKey: "OrganisationId",
        as: "Organisation",
      });
    }
  }
  Campaign.init(
    {
      OrganisationId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      type: DataTypes.ENUM("campaign", "cash-for-work"),
      spending: DataTypes.STRING,
      description: DataTypes.TEXT,
      status: DataTypes.STRING,
      is_funded: DataTypes.BOOLEAN,
      budget: DataTypes.FLOAT,
      location: DataTypes.STRING,
      start_date: DataTypes.DATE,
      end_date: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Campaign",
    }
  );
  return Campaign;
};
