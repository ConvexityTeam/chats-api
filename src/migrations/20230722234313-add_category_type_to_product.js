'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // await queryInterface.removeColumn('Products', 'product_category');
    // await queryInterface.addColumn('Products', 'category_id', {
    //   allowNull: true,
    //   type: Sequelize.INTEGER,
    //   after: 'tag',
    //   reference: {
    //     model: 'ProductCategories',
    //     key: 'id'
    //   }
    // });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropColumn('Products', 'category_id');
  }
};
