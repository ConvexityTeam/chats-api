const {generateKoraPayRef} = require('../utils');
const {koraPayConfig} = require('../config');
const {FundAccount} = require('../models');
const {Logger} = require('../libs');
const axios = require('axios');

const Axios = axios.create();
class KoraPayService {
  static async buildDepositData(
    organisation,
    _amount,
    CampaignId,
    _currency = null
  ) {
    const amount = _amount * 100;
    const currency = _currency || 'NGN';
    const ref = generateKoraPayRef();

    return new Promise(async (resolve, reject) => {
      try {
        await Axios.post(
          `${koraPayConfig.baseUrl}/merchant/api/v1/charges/initialize`,
          {
            amount,
            reference: ref,
            currency,
            narration: 'Organisation Deposit',
            customer: {
              email: organisation.email,
              name: organisation.name
            },
            metadata: {
              method: 'korapay',
              CampaignId,
              organisation_id: organisation.id
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${koraPayConfig.secret_key}`
            }
          }
        );
        await FundAccount.create({
          channel: 'fiat',
          service: 'korapay',
          OrganisationId: organisation.id,
          CampaignId,
          amount: _amount,
          transactionReference: ref
        });
        const data = {
          ref,
          email: organisation.email,
          currency,
          amount,
          metadata: {
            method: 'korapay',
            CampaignId,
            organisation_id: organisation.id
          }
        };
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = KoraPayService;
