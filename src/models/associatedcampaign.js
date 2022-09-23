'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AssociatedCampaign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      //AssociatedCampaign.belongsTo(models.Campaigns, { foreignKey: 'campaignId', as: 'associated_campaign' });
    }
  }
  AssociatedCampaign.init({
    donorOrganisationId: DataTypes.INTEGER,
    campaignId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'AssociatedCampaign',
  });
  return AssociatedCampaign;
};