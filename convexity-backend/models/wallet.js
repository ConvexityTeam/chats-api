"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Wallet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    // getAccountUserType(options) {
    //   if (!this.AccountUserType) return Promise.resolve(null);
    //   const mixinMethodName = `get${uppercaseFirst(this.AccountUserType)}`;
    //   return this[mixinMethodName](options);
    // }

    static associate(models) {
      Wallet.hasMany(models.Transaction, {
        as: "SentTransactions",
        foreignKey: "SenderWalletId",
      });
      Wallet.hasMany(models.Transaction, { 
        as: "ReceivedTransactions",
        foreignKey: "ReceiverWalletId",
      });

      Wallet.belongsTo(models.User, {
        as: 'User',
        foreignKey: "UserId",
        scope: {
          wallet_type: 'user'
        }
      });
      Wallet.belongsTo(models.Organisations, {
        as: 'Organisation',
        foreignKey: "OrganisationId",
      });

      Wallet.belongsTo(models.Campaign, {
        as: 'Campaign',
        foreignKey: "CampaignId",
        scope: {
          UserId: null,
        }
      });
    }
  }
  Wallet.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      address: DataTypes.STRING,
      privateKey: DataTypes.STRING,
      bantuAddress: DataTypes.STRING,
      bantuPrivateKey: DataTypes.STRING,
      CampaignId: DataTypes.INTEGER,
      OrganisationId: DataTypes.INTEGER,
      wallet_type: DataTypes.ENUM('user', 'organisation', 'campaign'),
      UserId: DataTypes.INTEGER,
      balance: DataTypes.FLOAT,
      crypto_balance: DataTypes.FLOAT,
      fiat_balance: DataTypes.FLOAT,
      local_currency: DataTypes.STRING,
    },
    {
      hooks: {
        afterFind: async (findResult) => {
          if (!Array.isArray(findResult)) findResult = [findResult];

          for (const instance of findResult) {
            if ( instance.AccountUserType === "user" && instance.user !== undefined ) {
              instance.AccountUserId = instance.user.id;
            } 
            else if ( instance.AccountUserType === "organisation" && instance.organisation !== undefined ) {
              instance.AccountUserId = instance.organisation.id;
            }
            // To prevent mistakes:
            delete instance.user;
            delete instance.dataValues.user;
            delete instance.organisation;
            delete instance.dataValues.organisation;
          }
        },
      },
      sequelize,
      modelName: "Wallet",
    }
  );
  Wallet.prototype.toObject = function() {
    const wallet = this.toJSON();
    delete wallet.privateKey;
    delete wallet.bantuPrivateKey;
    return wallet;
  }
  return Wallet;
};
