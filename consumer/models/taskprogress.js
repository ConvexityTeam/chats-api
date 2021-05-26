"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TaskProgress extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TaskProgress.hasMany(models.TaskProgressEvidence, {
        as: "Evidences",
      });
      TaskProgress.belongsTo(models.TaskUsers, {
        foreignKey: "TaskUserId",
        as: "TaskUser",
      });
    }
  }
  TaskProgress.init(
    {
      TaskUserId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "TaskProgress",
    }
  );
  return TaskProgress;
};
