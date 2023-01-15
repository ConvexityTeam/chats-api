'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CampaignForm extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CampaignForm.init(
    {
      question: DataTypes.STRING,
      select: DataTypes.STRING,
      answers: DataTypes.JSON,
      campaignId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'CampaignForm'
    }
  );
  return CampaignForm;
};
