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
      Campaign.hasMany(models.Transaction, {
        as: "Transaction",
        foreignKey: "TransactionalId",
        constraints: false,
        scope: {
          TransactionalType: "campaign",
        },
      });
      Campaign.belongsToMany(
        models.User, {
          as: 'Beneficiaries',
          foreignKey: "CampaignId",
          through: models.Beneficiary,
          constraints: false,
        });
      Campaign.hasMany(models.Tasks, {
        as: "Jobs"
      });
      Campaign.hasMany(models.Complaint, {
        as: 'Complaints',
        foreignKey: "CampaignId"
      })
      Campaign.belongsTo(models.Organisations, {
        foreignKey: "OrganisationId",
        as: "Organisation",
      });
    }
  }

  Campaign.init({
    OrganisationId: DataTypes.INTEGER,
    title: DataTypes.STRING,
    type: DataTypes.ENUM("campaign", "cash-for-work"),
    spending: DataTypes.STRING,
    description: DataTypes.TEXT,
    status: DataTypes.STRING,
    is_funded: DataTypes.BOOLEAN,
    funded_with: DataTypes.STRING,
    budget: DataTypes.FLOAT,
    location: DataTypes.STRING,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
  }, {
    sequelize,
    modelName: "Campaign",
  });
  return Campaign;
};