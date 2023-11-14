'use strict';
const {Logger} = require('../libs');
const db = require('../models');
const uuid = require('uuid');
function toPlural(modelName) {
  // Very basic pluralization, just for demonstration purposes
  const lastChar = modelName.slice(-1);
  if (lastChar === 's') {
    return modelName;
  }
  if (lastChar === 'y') {
    return modelName.slice(0, -1) + 'ies';
  }
  if (lastChar === 'h') {
    return modelName.slice(0, -1) + 'es';
  }
  return modelName + 's'; // Appending 's' as a simple way to pluralize
}
function toGerund(modelName) {
  // Very basic pluralization, just for demonstration purposes
  return modelName + 'es'; // Appending 'es' as a simple way to pluralize
}
const gerundModelNames = ['Liveness', 'Business'];
const pluralModelNames = [
  'AssociatedCampaign',
  'BankAccount',
  'Beneficiary',
  'Campaign',
  'CampaignForm',
  'CampaignHistory',
  'CampaignImpactReport',
  'CampaignVendor',
  'Complaint',
  'FingerPrints',
  'FormAnswer',
  'FundAccount',
  'Group',
  'Invites',
  'Market',
  'Member',
  'Order',
  'OrderProduct',
  'Organisation',
  'OrganisationMembers',
  'OneTimePassword',
  'Plan',
  'Product',
  'ProductBeneficiary',
  'ProductCategory',
  'VendorProduct',
  'ProposalRequest',
  'RequestFund',
  'Role',
  'Subscription',
  'SwitchToken',
  'Task',
  'TaskAssignment',
  'TaskAssignmentEvidence',
  'User',
  'VendorProposal',
  'VerificationToken',
  'VoucherToken',
  'ZohoToken'
];
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const transaction = await queryInterface.sequelize.transaction(
        async t => {
          //adding commit
          await Promise.all(
            pluralModelNames.map(async modelName => {
              let tableName = toPlural(modelName);

              await queryInterface.addColumn(
                tableName,
                'uuid',
                {
                  type: Sequelize.UUID,
                  allowNull: true,
                  after: 'id',
                  defaultValue: Sequelize.UUIDV4
                },
                {transaction: t}
              );

              // Update each row with a new UUID
              let updateRecords = await db[modelName].findAll({
                where: {uuid: null}
              });
              await Promise.all(
                updateRecords.map(async record => {
                  await record.update(
                    {
                      uuid: uuid.v4()
                    },
                    {
                      where: {
                        id: row.id
                      },
                      transaction: t
                    }
                  );
                })
              );
              console.log(
                `Processing model 1: ${modelName}, Table: ${tableName}`
              );
            })
          );
          await Promise.all(
            gerundModelNames.map(async modelName => {
              let tableName = toGerund(modelName);

              await queryInterface.addColumn(
                tableName,
                'uuid',
                {
                  type: Sequelize.UUID,
                  allowNull: true,
                  after: 'id',
                  defaultValue: Sequelize.UUIDV4
                },
                {transaction: t}
              );

              let updateRecords = await db[modelName].findAll({
                where: {uuid: null}
              });
              await Promise.all(
                updateRecords.map(async record => {
                  await record.update(
                    {
                      uuid: uuid.v4()
                    },
                    {
                      where: {
                        id: row.id
                      },
                      transaction: t
                    }
                  );
                })
              );
              console.log(
                `Processing model 2: ${modelName}, Table: ${tableName}`
              );
            })
          );
        }
      );
      return transaction;
    } catch (error) {
      Logger.error(`Migration for adding and updating uuid failed: ${error}`);
    }
  },
  down: async (queryInterface, Sequelize) => {
    //adding rollback
    try {
      const transaction = await queryInterface.sequelize.transaction(
        async t => {
          await Promise.all(
            pluralModelNames.map(async modelName => {
              const tableName = toPlural(modelName);
              await queryInterface.removeColumn(tableName, 'uuid', {
                transaction: t
              });
            })
          );
          await Promise.all(
            gerundModelNames.map(async modelName => {
              const tableName = toGerund(modelName);
              await queryInterface.removeColumn(tableName, 'uuid', {
                transaction: t
              });
            })
          );
        }
      );
      return transaction;
    } catch (error) {
      Logger.error(`Migration for removing uuid failed: ${error}`);
    }
  }
};
