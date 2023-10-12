module.exports = {
  up: async () => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    // queryInterface.removeColumn('Products', 'MarketId');
  },

  down: async () => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // queryInterface.dr('Tasks', 'isCompleted');
    // await queryInterface.dropTable('Products');

  },
};
