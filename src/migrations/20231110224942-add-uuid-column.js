'use strict';
const db = require('../models');
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
  'ImpactReports',
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
    const addUuidColumnPromises = pluralModelNames.map(async modelName => {
      console.log(`Adding uuid column to ${modelName}`);
      const tableName = toPlural(modelName);
      // await queryInterface.removeColumn(tableName, 'uuid');
      await queryInterface.addColumn(tableName, 'uuid', {
        type: Sequelize.UUID,
        allowNull: true,
        after: 'id',
        defaultValue: Sequelize.UUIDV4
      });
      const results = await db[modelName].findAll({
        where: {
          uuid: null
        }
      });
      const updatePromises = results.map(result =>
        db[modelName].update(
          {
            uuid: Sequelize.UUIDV4
          },
          {
            where: {
              id: result.id
            }
          }
        )
      );
      return await Promise.all(updatePromises);
    });
    await Promise.all(addUuidColumnPromises);
    const addGerundUuidColumnPromises = gerundModelNames.map(
      async modelName => {
        const tableName = toGerund(modelName);
        // await queryInterface.removeColumn(tableName, 'uuid');
        await queryInterface.addColumn(tableName, 'uuid', {
          type: Sequelize.UUID,
          allowNull: true,
          after: 'id',
          defaultValue: Sequelize.UUIDV4
        });
        const results = await db[modelName].findAll({
          where: {
            uuid: null
          }
        });
        const updatePromises = results.map(result =>
          db[modelName].update(
            {
              uuid: Sequelize.UUIDV4
            },
            {
              where: {
                id: result.id
              }
            }
          )
        );
        return await Promise.all(updatePromises);
      }
    );
    await Promise.all(addGerundUuidColumnPromises);
  },
  down: async (queryInterface, Sequelize) => {
    const removePluralUuidColumnPromises = pluralModelNames.map(
      async modelName => {
        const tableName = toPlural(modelName);
        await queryInterface.removeColumn(tableName, 'uuid');
      }
    );
    await Promise.all(removePluralUuidColumnPromises);
    const removeGerundUuidColumnPromises = gerundModelNames.map(
      async modelName => {
        const tableName = toGerund(modelName);
        await queryInterface.removeColumn(tableName, 'uuid');
      }
    );
    await Promise.all(removeGerundUuidColumnPromises);
  }
};
