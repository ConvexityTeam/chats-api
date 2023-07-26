'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProductCategory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // ProductCategory.belongsTo(models.ProposalRequest, {
      //   foreignKey: 'category_id',
      //   as: 'category_type'
      // });
    }
  }
  ProductCategory.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      organisation_id: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'ProductCategory'
    }
  );
  return ProductCategory;
};