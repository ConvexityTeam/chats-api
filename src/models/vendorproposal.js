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
    }
  }
  VendorProposal.init(
    {
      vendor_id: DataTypes.INTEGER,
      proposal_id: DataTypes.INTEGER,
      budget: DataTypes.FLOAT,
      quantity: DataTypes.INTEGER,
      unit_price: DataTypes.FLOAT
    },
    {
      sequelize,
      modelName: 'VendorProposal'
    }
  );
  return VendorProposal;
};