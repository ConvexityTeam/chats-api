'use strict';

const {Sequelize} = require('sequelize');

function toPlural(modelName) {
  // Very basic pluralization, just for demonstration purposes
  const lastChar = modelName.slice(-1);
  if (lastChar === 's') {
    return modelName;
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
  'Login',
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
  'Transaction',
  'User',
  'VendorProposal',
  'VerificationToken',
  'VoucherToken',
  'Wallet',
  'ZohoToken'
];

module.exports = {
  up: async queryInterface => {
    const addUuidColumnPromises = pluralModelNames.map(async modelName => {
      const tableName = toPlural(modelName);
      await queryInterface.addColumn(tableName, 'uuid', {
        type: Sequelize.UUID,
        allowNull: false,
        after: 'id',
        defaultValue: Sequelize.UUIDV4
      });

      const models = await queryInterface.sequelize.models[modelName].findAll();
      const updatePromises = models.map(model =>
        model.update({uuid: Sequelize.UUIDV4}, {where: {uuid: null}})
      );

      return Promise.all(updatePromises);
    });

    await Promise.all(addUuidColumnPromises);
    const addGerundUuidColumnPromises = gerundModelNames.map(
      async modelName => {
        const tableName = toGerund(modelName);
        await queryInterface.addColumn(tableName, 'uuid', {
          type: Sequelize.UUID,
          allowNull: false,
          after: 'id',
          defaultValue: Sequelize.UUIDV4
        });

        const models = await queryInterface.sequelize.models[
          modelName
        ].findAll();
        const updatePromises = models.map(model =>
          model.update({uuid: Sequelize.UUIDV4}, {where: {uuid: null}})
        );

        return Promise.all(updatePromises);
      }
    );

    await Promise.all(addGerundUuidColumnPromises);
  },

  down: async queryInterface => {
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
