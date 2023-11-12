'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class VendorProposal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      VendorProposal.hasMany(models.Product, {
        foreignKey: 'vendor_proposal_id',
        as: 'proposal_products'
      });
      VendorProposal.hasMany(models.User, {
        foreignKey: 'vendor_id',
        as: 'proposalOwner'
      });
      VendorProposal.belongsTo(models.Campaign, {
        foreignKey: 'CampaignId',
        as: 'campaign'
      });
    }
  }
  VendorProposal.init(
    {
      uuid: DataTypes.UUIDV4,
      CampaignId: DataTypes.INTEGER,
      vendor_id: DataTypes.INTEGER,
      proposal_id: DataTypes.INTEGER,
      status: DataTypes.ENUM('pending', 'approved', 'rejected')
    },
    {
      sequelize,
      modelName: 'VendorProposal'
    }
  );
  return VendorProposal;
};
