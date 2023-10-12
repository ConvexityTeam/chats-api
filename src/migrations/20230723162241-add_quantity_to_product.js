module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('ProposalRequests', 'product_id');
    await queryInterface.addColumn('Products', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn('Products', 'proposal_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ProposalRequests',
        key: 'id',
      },
      OnDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Products', 'quantity');
  },
};
