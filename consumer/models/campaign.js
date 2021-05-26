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
      Campaign.hasMany(models.Transaction, {
        as: "Transaction",
        foreignKey: "TransactionalId",
        constraints: false,
        scope: {
          TransactionalType: "campaign",
        },
      });
      Campaign.hasMany(models.Beneficiaries, { as: "Beneficiaries" });
      Campaign.hasMany(models.Tasks, { as: "Jobs" });
      Campaign.belongsTo(models.OrganisationMembers, {
        foreignKey: "OrganisationMemberId",
        as: "OrganisationMember",
      });
    }
  }
  Campaign.init(
    {
      OrganisationMemberId: DataTypes.STRING,
      title: DataTypes.STRING,
      type: DataTypes.STRING, //1 for normal Campaign, 2 for cash for work
      description: DataTypes.TEXT,
      status: DataTypes.INTEGER,
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
