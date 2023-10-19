'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FormAnswer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FormAnswer.init(
    {
      formId: DataTypes.UUID,
      beneficiaryId: DataTypes.UUID,
      questions: DataTypes.JSON,
      campaignId: DataTypes.UUID
    },
    {
      sequelize,
      modelName: 'FormAnswer'
    }
  );
  return FormAnswer;
};
