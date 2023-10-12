const dotenv = require('dotenv');

dotenv.config();
const request = require('request');

class Paystack {
  /**
   *
   * @param {string} transactionId The transaction Id to confirm on the paystack endpoint
   * @returns {object} returns object type
   */
  static confirmDeposit(transactionId) {
    return new Promise((resolve, reject) => {
      const options = {
        url: `https://api.paystack.co/transaction/verify/${transactionId}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY_TEST}`,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }

  static getBankList() {
    return new Promise((resolve, reject) => {
      const options = {
        url:
          'https://api.paystack.co/bank'
          || 'http://127.0.0.1/code-lab/banks.json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY_TEST}`,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }

  /**
   *
   * @param {string} accountNumber Recipients account number
   * @param {string} bankCode Recipients Bank Code
   */
  static resolveBankAccount(accountNumber, bankCode) {
    return new Promise((resolve, reject) => {
      const options = {
        url:
          `https://api.paystack.co/bank/resolve?account_number=${
            accountNumber
          }&bank_code=${
            bankCode}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY_TEST}`,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }

  static transferRecipients(
    accountNumber = '0164063227',
    bankCode = '058',
    name = 'Habeeb Salami Alabi',
  ) {
    return new Promise((resolve, reject) => {
      const payload = {
        type: 'nuban',
        name,
        description: 'Testing Transfer Endpoint',
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      };
      const options = {
        url: 'https://api.paystack.co/transferrecipient/',
        method: 'POST',
        body: payload,
        json: true,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY_TEST}`,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }

  static transferToBank(amount, recipientCode) {
    return new Promise((resolve, reject) => {
      const payload = {
        source: 'balance',
        reason: 'Transfer To Customer Account',
        amount,
        recipient: recipientCode,
        reference: Date(),
      };
      const options = {
        url: 'https://api.paystack.co/transfer',
        method: 'POST',
        body: payload,
        json: true,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY_TEST}`,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }
}

module.exports = new Paystack();
