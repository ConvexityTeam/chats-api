'use strict';

const { Model } = require('sequelize');
const sequelizePaginate = require('sequelize-paginate');
module.exports = (sequelize, DataTypes) => {
  class Complaints extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Complaints.belongsTo(models.Beneficiaries, { foreignKey: 'BeneficiaryId', as: 'Beneficiary' })
    }
  };
  Complaints.init({
    BeneficiaryId: DataTypes.INTEGER,
    report: DataTypes.TEXT,
    status: DataTypes.ENUM('resolved', 'unresolved'),
  }, {
    sequelize,
    modelName: 'Complaints',
  });
  sequelizePaginate.paginate(Complaints)
  return Complaints;
};
