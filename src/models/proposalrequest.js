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
      ProposalRequest.hasMany(models.VendorProposal, {
        foreignKey: 'proposal_id',
        as: 'vendor_proposals'
      });
      ProposalRequest.hasMany(models.VendorProposal, {
        foreignKey: 'vendor_id',
        as: 'requests'
      });
    }
  }
  ProposalRequest.init(
    {
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
