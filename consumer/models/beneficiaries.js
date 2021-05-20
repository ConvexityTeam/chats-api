'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Beneficiaries extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Beneficiaries.belongsTo(models.User, { foreignKey: 'UserId', as: 'User' });
      Beneficiaries.belongsTo(models.Campaign, { foreignKey: 'CampaignId', as: 'Campaign' });
      Beneficiaries.hasMany(models.Complaints, { as: 'Complaints' })
    }
  };
  Beneficiaries.init({
    UserId: DataTypes.INTEGER,
    CampaignId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Beneficiaries',
  });
  return Beneficiaries;
};
