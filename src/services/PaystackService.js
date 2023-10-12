const { paystackConfig } = require('../config');
const { FundAccount } = require('../models');
const { generatePaystackRef } = require('../utils');
const { Logger } = require('../libs');

// eslint-disable-next-line import/order
const paystack = require('paystack-api')(paystackConfig.secretKey);

class PaystackService {
  static async buildDepositData(
    organisation,
    _amount,
    CampaignId,
    _currency = null,
  ) {
    let devData = null;
    const amount = _amount * 100;
    const currency = _currency || paystackConfig.defaultCurrency;
    const ref = generatePaystackRef();

    if (process.env.NODE_ENV === 'development') {
      devData = (
        await paystack.transaction.initialize({
          reference: ref,
          amount,
          email: organisation.email,
        })
      ).data || null;
    }

    FundAccount.create({
      channel: 'fiat',
      service: 'paystack',
      OrganisationId: organisation.id,
      CampaignId,
      amount: _amount,
      transactionReference: ref,
    });

    return {
      ref,
      email: organisation.email,
      key: paystackConfig.publickKey,
      channels: paystackConfig.channels,
      currency,
      amount,

      metadata: {
        CampaignId,
        organisation_id: organisation.id,
      },
      ...(devData && {
        dev_data: devData,
      }),
    };
  }

  static verifyDeposit(reference) {
    return new Promise((resolve, reject) => {
      paystack.transaction.verify(reference)
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static async withdraw(source, amount, recipient, reason) {
    return new Promise((resolve, reject) => {
      const value = amount * 100;
      Logger.info('Transferring Funds to Bank Account');
      paystack.transfer.create({
        source,
        amount: value,
        recipient,
        reason,
      }).then((response) => {
        Logger.info('Funds Transferred to Bank Account');
        resolve(response);
      }).catch((error) => {
        Logger.error(`Error Transferring Funds to Bank account: ${error}`);
        reject(error);
      });
    });
  }

  static async resolveAccount(accountNumber, bankCode) {
    return new Promise((resolve, reject) => {
      paystack.verification.resolveAccount({
        account_number: accountNumber,
        bank_code: bankCode,
      }).then((response) => {
        if (!response.status) throw new Error('Request failed.');
        resolve(response.data);
      }).catch(() => {
        reject(new Error('Could not resolve account. Check details.'));
      });
    });
  }

  static async listBanks(query = {}) {
    return new Promise((resolve, reject) => {
      paystack.misc.list_banks(query)
        .then((response) => {
          const banks = response.data.map((bank) => ({
            name: bank.name,
            country: bank.country,
            currency: bank.currency,
            code: bank.code,
          }));
          resolve(banks);
        }).catch((error) => {
          reject(error);
        });
    });
  }

  static async createRecipientReference(name, accountNumber, bankCode) {
    return new Promise((resolve, reject) => {
      paystack.transfer_recipient.create({
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
      }).then((response) => {
        if (!response.status) throw new Error('Request failed.');
        resolve(response.data);
      }).catch(() => {
        reject(new Error('Recipient creation failed.'));
      });
    });
  }
}

module.exports = PaystackService;
