'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Liveness extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Liveness.init(
    {
      first_name: DataTypes.STRING,
      surname: DataTypes.STRING,
      email: DataTypes.STRING,
      liveness_capture: DataTypes.STRING,
      nin_photo_url: DataTypes.STRING,
      phone: DataTypes.STRING,
      marital_status: DataTypes.ENUM('single', 'married', 'divorced'),
      dob: DataTypes.DATE,
      authorized_by: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'Liveness'
    }
  );
  return Liveness;
};
