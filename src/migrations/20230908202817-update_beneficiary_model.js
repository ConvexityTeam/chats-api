module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Beneficiaries', 'status', {
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
    await queryInterface.removeColumn('Beneficiaries', 'status');
  },
};
