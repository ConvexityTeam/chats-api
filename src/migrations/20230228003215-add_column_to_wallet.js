module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.addColumn('Wallets', 'tokenIds', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });
    // await queryInterface.addColumn('Campaigns', 'minting_limit', {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    //   defaultValue: 0
    // });
  },

  down: async (queryInterface) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.removeColumn('Wallets', 'tokenIds');
  },
};
