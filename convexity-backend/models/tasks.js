'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tasks extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Tasks.belongsTo(models.Campaign, { foreignKey: 'CampaignId', as: 'Campaign' });
      // Campaign.belongsTo(models.Organisations, { foreignKey: 'OrganisationId', as: 'Organisation' });
    }
  };
  Tasks.init({
    UserId: DataTypes.STRING,
    CampaignId: DataTypes.STRING,
    task: DataTypes.STRING,
    assignee: DataTypes.STRING,
    supervisor: DataTypes.STRING,
    completion_evidence: DataTypes.STRING,
    status: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Tasks',
  });
  return Tasks;
};