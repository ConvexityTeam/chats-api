'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    //update market order
    await queryInterface.removeColumn('Markets', 'location');
    await queryInterface.addColumn('Markets', 'location', {
      allowNull: true,
      type: Sequelize.JSON
    });
    await queryInterface.addColumn('Markets', 'category_id', {
      allowNull: true,
      type: Sequelize.UUID,
      references: {
        model: 'ProductCategories',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addColumn('Markets', 'website_url', {
      allowNull: true,
      type: Sequelize.STRING
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Markets', 'category');
  }
};
