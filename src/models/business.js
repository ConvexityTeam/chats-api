const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Business extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate() {
      // define association here
    }
  }
  Business.init(
    {
      name: DataTypes.STRING,
      bizId: DataTypes.STRING,
      document: DataTypes.STRING,
      accountId: DataTypes.INTEGER,
      vendorId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Business',
    },
  );
  return Business;
};
