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
  // 'ImpactReports',
  'Invites',
  // 'Login',
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
              console.log(`Adding uuid to ${tableName} 1`);
              const rowsToUpdate = await db[modelName].findAll({
                where: {
                  uuid: null
                },
                transaction: t
              });

              // Update each row with a new UUID
              rowsToUpdate.map(async row => {
                if (typeof row.id !== 'undefined') {
                  await db[modelName].update(
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
                } else {
                  console.log(`Model: ${modelName}`);
                  console.log(`Row: ${JSON.stringify(row)}`);
                  console.log(`ID: ${row.id}`);
                }
              });

              console.log(`updating uuid in ${tableName} 1`);
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
              console.log(`Adding uuid to ${tableName} 2`);
              const rowsToUpdate = await db[modelName].findAll({
                where: {
                  uuid: null
                },
                transaction: t
              });

              console.log(
                `All rows to update 2: ${JSON.stringify(rowsToUpdate)}`
              );
              // Update each row with a new UUID
              rowsToUpdate.map(async row => {
                if (typeof row.id !== 'undefined') {
                  await db[modelName].update(
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
                } else {
                  console.log(`Model: ${modelName}`);
                  console.log(`Row: ${JSON.stringify(row)}`);
                  console.log(`ID: ${row.id}`);
                }
              });

              console.log(`updating uuid in ${tableName} 2`);
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
