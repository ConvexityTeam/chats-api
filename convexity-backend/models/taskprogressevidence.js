"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TaskProgressEvidence extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TaskProgressEvidence.belongsTo(models.TaskProgress, {
        foreignKey: "TaskProgressId",
        as: "TaskProgress",
      });
    }
  }
  TaskProgressEvidence.init(
    {
      TaskProgressId: DataTypes.INTEGER,
      imageUrl: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "TaskProgressEvidence",
    }
  );
  return TaskProgressEvidence;
};
