'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Campaigns', 'OrganisationMemberId');
    await queryInterface.addColumn('Campaigns', 'OrganisationId', {
      allowNull: true,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'Organisations'
        },
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Campaigns', 'OrganisationId');
    await queryInterface.addColumn('Campaigns', 'OrganisationMemberId', {
      allowNull: true,
      defaultValue: Sequelize.UUIDV4,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'OrganisationMembers'
        },
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
