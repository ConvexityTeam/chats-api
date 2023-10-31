'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TaskAssignments', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      uuid: {
        allowNull: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      TaskId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Tasks'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      UserId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Users'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      uploaded_evidence: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      approved_by_agent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      approved_by_vendor: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      approved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      approved_by: {
        type: Sequelize.INTEGER,
        defaultValue: null
      },
      approved_at: {
        type: Sequelize.DATE,
        defaultValue: null
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'in progress',
          'rejected',
          'disbursed',
          'approved',
          'completed'
        ), //approved -> recieved approval from NGO admin | completed -> paid
        default: 'pending'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('TaskAssignments');
  }
};
