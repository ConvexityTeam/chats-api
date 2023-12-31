'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class VendorProduct extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  VendorProduct.init(
    {
      // id: {
      //   type: DataTypes.INTEGER,
      //   primaryKey: true
      // },
      uuid: DataTypes.UUID,
      productId: DataTypes.INTEGER,
      vendorId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'VendorProduct'
    }
  );
  return VendorProduct;
};
