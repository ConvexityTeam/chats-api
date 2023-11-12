'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OneTimePassword extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OneTimePassword.belongsTo(models.User, {
        foreignKey: 'UserId',
        as: 'User'
      });
    }
  }
  OneTimePassword.init(
    {
      uuid: DataTypes.UUIDV4,
      ref: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      UserId: DataTypes.INTEGER,
      token: DataTypes.STRING,
      request_ip: DataTypes.STRING,
      expires_at: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'OneTimePassword',
      tableName: 'OneTimePasswords'
    }
  );

  OneTimePassword.prototype.toObject = function () {
    const data = this.toJSON();
    delete data.token;
    delete data.UserId;
    return data;
  };
  return OneTimePassword;
};
