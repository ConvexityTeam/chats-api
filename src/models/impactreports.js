'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ImpactReports extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ImpactReports.belongsTo(models.User, {
        foreignKey: 'AgentId',
        as: 'User'
      });
      ImpactReports.belongsTo(models.Campaign, {
        foreignKey: 'CampaignId',
        as: 'Campaign'
      });
    }
  }
  ImpactReports.init(
    {
      title: DataTypes.STRING,
      CampaignId: DataTypes.UUID,
      AgentId: DataTypes.UUID,
      MediaLink: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'ImpactReports'
    }
  );
  return ImpactReports;
};
