module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('VendorProposals', 'CampaignId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Campaigns',
        key: 'id',
      },
    });
  },

  down: async (queryInterface) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('VendorProposals', 'CampaignId');
  },
};
