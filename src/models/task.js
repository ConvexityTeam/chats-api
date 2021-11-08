"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Task.hasMany(models.TaskUsers, { as: "AssociatedWorkers" });
      Task.belongsTo(models.Campaign, {
        foreignKey: "CampaignId",
        as: "Campaign",
      });
    }
  }
  Task.init(
    {
      CampaignId: DataTypes.INTEGER,
      name: DataTypes.STRING,
      description: DataTypes.STRING,
      amount: DataTypes.INTEGER,
      // status: DataTypes.ENUM("fulfilled", "pending"),
      // approval: DataTypes.STRING,
      assignment_count: DataTypes.INTEGER,
      assigned: DataTypes.INTEGER,
      require_vendor_approval: DataTypes.INTEGER,
      require_agent_approval: DataTypes.INTEGER,
      require_evidence: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Task",
    }
  );
  return Task;
};
