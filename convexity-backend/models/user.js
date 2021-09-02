"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    capitalizeFirstLetter(str) {
      let string = str.toLowerCase();
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // User.hasMany(models.Campaign, { as: 'campaigns' });
      // User.hasMany(models.Login, { as: 'logins' });
      User.hasMany(models.Transaction, {
        as: "Transaction",
        foreignKey: "TransactionalId",
        constraints: false,
        scope: {
          TransactionalType: "user",
        },
      });
      User.hasMany(models.Beneficiaries, { as: "Beneficiaries" });
      User.hasMany(models.TaskUsers, { as: "AssociatedJobs" });
      User.hasMany(models.Wallet, {
        as: "Wallet",
        foreignKey: "AccountUserId",
        constraints: false,
        scope: {
          AccountUserType: "user",
        },
      });
      ////////////////////////
      User.hasOne(models.Market, { as: "Store", foreignKey: "UserId" });
      User.hasMany(models.Order, { as: "Order" });
      User.hasMany(models.OrganisationMembers, {
        as: "AssociatedOrganisations",
      });
      User.hasMany(models.FingerPrints, { as: "Print" });
      User.hasMany(models.Accounts, { as: "Accounts" });
      User.belongsTo(models.Role, { foreignKey: "RoleId", as: "Role" });
    }
  }
  User.init(
    {
      referal_id: DataTypes.STRING,
      RoleId: DataTypes.INTEGER,
      first_name: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue("first_name", this.capitalizeFirstLetter(value));
        },
      },
      last_name: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue("last_name", this.capitalizeFirstLetter(value));
        },
      },
      email: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue("email", value.toLowerCase());
        },
      },
      password: DataTypes.STRING,
      phone: DataTypes.STRING,
      bvn: DataTypes.STRING,
      nin: DataTypes.STRING,
      marital_status: DataTypes.STRING,
      gender: DataTypes.STRING,
      status: DataTypes.ENUM("suspended", "activated", "pending"),
      location: DataTypes.STRING,
      pin: DataTypes.STRING,
      address: DataTypes.STRING,
      vendor_id: DataTypes.STRING,
      is_email_verified: DataTypes.BOOLEAN,
      is_phone_verified: DataTypes.BOOLEAN,
      is_bvn_verified: DataTypes.BOOLEAN,
      is_nin_verified: DataTypes.BOOLEAN,
      is_self_signup: DataTypes.BOOLEAN,
      is_public: DataTypes.BOOLEAN,
      is_tfa_enabled: DataTypes.BOOLEAN,
      tfa_secret: DataTypes.STRING,
      last_login: DataTypes.DATE,
      profile_pic: DataTypes.STRING,
      nfc: DataTypes.STRING,
      dob: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
