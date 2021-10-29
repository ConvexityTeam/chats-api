const { paystackConfig } = require('../config');
const { FundAccount } = require('../models');
const { generatePaystackRef } = require('../utils');
const paystack = require('paystack')(paystackConfig.secretKey);
class PaystackService {

  static async buildDepositData(organisation, _amount, _currency = null) {
    let dev_data = null;
    const amount = _amount * 100;
    const currency = _currency || paystackConfig.defaultCurrency;
    const ref = generatePaystackRef();

    if(process.env.NODE_ENV == 'development') {
      dev_data = (await paystack.transaction.initialize({
        reference: ref, amount, email: organisation.email
      })).data || null;
    }

    

    FundAccount.create({
      channel: 'fiat',
      service: 'paystack',
      OrganisationId: organisation.id,
      amount: _amount,
      transactionReference: ref
    });

    return {
      ref,
      email: organisation.email,
      key: paystackConfig.publickKey,
      channels: paystackConfig.channels,
      currency,
      amount,
      
      metadata: {
        organisation_id: organisation.id
      },
      ...({dev_data})
    }
  }
}

module.exports = PaystackService;