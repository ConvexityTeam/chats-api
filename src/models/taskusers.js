"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TaskUsers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TaskUsers.hasMany(models.TaskProgress, {
        foreignKey: "TaskUserId",
        as: "CompletionRequest",
      });
      TaskUsers.belongsTo(models.User, { foreignKey: "UserId", as: "Worker" });
      TaskUsers.belongsTo(models.Tasks, { foreignKey: "TaskId", as: "Task" });
    }
  }
  TaskUsers.init(
    {
      UserId: DataTypes.INTEGER,
      TaskId: DataTypes.INTEGER,
      type: DataTypes.ENUM("supervisor", "worker"),
    },
    {
      sequelize,
      modelName: "TaskUsers",
    }
  );
  return TaskUsers;
};
