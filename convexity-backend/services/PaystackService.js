const { paystackConfig } = require('../config');
const { generatePaystackRef } = require('../utils');
class PaystackService {

  static buildDepositData(organisation_id, _amount, _currency = null) {
    return new Promise((resolve, reject) => {
      const amount = _amount * 100;
      const currency = _currency || paystackConfig.defaultCurrency;
      const ref = generatePaystackRef();

      if (!paystackConfig.currencies.includes(currency)) {
        reject(new Error(`${currency} not supported.`));
        return;
      }

      if (amount <= 0) {
        reject(new Error(`Deposit amount must be greater than 0`));
        return;
      }

      resolve({
        ref,
        metadata: {
          organisation_id
        },
        key: paystackConfig.publickKey,
        channels: paystackConfig.channels,
        currency,
        amount
      });

    });
  }
}

module.exports = PaystackService;