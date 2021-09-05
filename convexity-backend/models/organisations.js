"use strict";
const { Model } = require("sequelize");
const { async } = require("regenerator-runtime");
module.exports = (sequelize, DataTypes) => {
  class Organisations extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Organisations.hasMany(models.Transaction, {
        as: "Transaction",
        foreignKey: "TransactionalId",
        constraints: false,
        scope: {
          TransactionalType: "organisation",
        },
      });

      Organisations.hasMany(models.OrganisationMembers, { as: "Member" });
      Organisations.hasMany(models.FundAccount, { as: "MintTransaction" });
      Organisations.hasMany(models.Campaign, { as: 'Campaign', foreignKey: "OrganisationId" })
      Organisations.hasMany(models.Wallet, {
        as: "Wallet",
        foreignKey: "AccountUserId",
        constraints: false,
        scope: {
          AccountUserType: "organisation",
        },
      });
    }
  }
  Organisations.init(
    {
      name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue("email", value.toLowerCase());
        },
      },
      phone: DataTypes.STRING,
      address: DataTypes.STRING,
      state: DataTypes.STRING,
      country: DataTypes.STRING,
      logo_link: DataTypes.STRING,
      website_url: DataTypes.STRING,
      registration_id: DataTypes.STRING,
      is_verified: DataTypes.BOOLEAN,
      year_of_inception: DataTypes.STRING,
      verificationMode: DataTypes.ENUM("1", "2"),
    },
    {
      sequelize,
      modelName: "Organisations",
    }
  );
  return Organisations;
};
