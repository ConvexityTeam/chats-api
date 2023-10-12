module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Campaigns', 'total_imported', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await queryInterface.addColumn('Campaigns', 'total_beneficiaries', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await queryInterface.addColumn('Campaigns', 'fund_status', {
      type: Sequelize.ENUM(
        'pending',
        'in_progress',
        'processing',
        'success',
        'error',
      ),
      defaultValue: 'pending',
    });
  },

  down: async (queryInterface) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Campaigns', 'total_imported');
    await queryInterface.removeColumn('Campaigns', 'total_beneficiaries');
    await queryInterface.removeColumn('Campaigns', 'fund_status');
  },
};
