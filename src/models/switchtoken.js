'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SwitchToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SwitchToken.init(
    {
      uuid: DataTypes.UUIDV4,
      accessToken: DataTypes.TEXT,
      expires: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'SwitchToken'
    }
  );
  return SwitchToken;
};
