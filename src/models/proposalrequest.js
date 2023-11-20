'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProposalRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // ProposalRequest.hasMany(models.VendorProposal, {
      //   foreignKey: 'proposal_id',
      //   as: 'vendor_proposals'
      // });
      ProposalRequest.belongsTo(models.Campaign, {
        foreignKey: 'campaign_id',
        as: 'campaign_requests'
      });
      ProposalRequest.hasMany(models.VendorProposal, {
        foreignKey: 'vendor_id',
        as: 'requests'
      });
      // ProposalRequest.hasOne(models.ProductCategory, {
      //   foreignKey: 'category_id',
      //   as: 'proposal_type'
      // });
    }
  }
  ProposalRequest.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      uuid: DataTypes.UUID,
      category_id: DataTypes.INTEGER,
      campaign_id: DataTypes.INTEGER,
      organisation_id: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'ProposalRequest'
    }
  );
  return ProposalRequest;
};
