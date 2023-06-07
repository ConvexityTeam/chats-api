'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Group.init({
    full_name: DataTypes.STRING,
    profile_pic: DataTypes.STRING,
    dob: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Group',
  });
  return Group;
};