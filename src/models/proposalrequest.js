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
    }
  }
  ProposalRequest.init(
    {
      product_name: DataTypes.STRING,
      tag: DataTypes.ENUM('product', 'service'),
      category_type: DataTypes.STRING,
      quantity: DataTypes.INTEGER,
      description: DataTypes.TEXT,
      location: DataTypes.JSON,
      start_date: DataTypes.DATE,
      end_date: DataTypes.DATE,
      price: DataTypes.DOUBLE,
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
