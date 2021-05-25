"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Tasks extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Tasks.hasMany(models.Transaction, {
        as: "Transaction",
        foreignKey: "TransactionalId",
        constraints: false,
        scope: {
          TransactionalType: "wage",
        },
      });
      Tasks.hasMany(models.TaskUsers, { as: "AssociatedWorkers" });
      Tasks.belongsTo(models.Campaign, {
        foreignKey: "CampaignId",
        as: "Campaign",
      });
    }
  }
  Tasks.init(
    {
      CampaignId: DataTypes.INTEGER,
      name: DataTypes.STRING,
      description: DataTypes.STRING,
      amount: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Tasks",
    }
  );
  return Tasks;
};
