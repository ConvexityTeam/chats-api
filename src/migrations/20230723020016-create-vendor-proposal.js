/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('VendorProposals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      quantity: {
        type: Sequelize.INTEGER,
      },
      cost: {
        type: Sequelize.FLOAT,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id',
        },
        OnDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      proposal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProposalRequests',
          key: 'id',
        },
        OnDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('VendorProposals');
  },
};
