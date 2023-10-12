module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('VendorProposals', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
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
    await queryInterface.removeColumn('VendorProposals', 'status');
  },
};
