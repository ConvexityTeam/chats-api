const { default: axios } = require('axios');
const { termiiConfig } = require('../config');

class SmsService {
  httpService;

  constructor() {
    this.httpService = axios.create({
      baseURL: termiiConfig.baseUrl,
    });
  }

  async sendMessage(recipients, message) {
    const recipientsMail = Array.isArray(recipients) ? recipients : [recipients];
    const to = this.prunRecipients(recipientsMail);
    return this.send(to, message);
  }

  async sendOtp(recipients, message) {
    const recipientsMail = Array.isArray(recipients) ? recipients : [recipients];
    const to = this.prunRecipients(recipientsMail);
    return this.send(to, message);
  }

  async send(to, sms, channel = 'generic') {
    const data = this.loadData({ to, sms, channel });
    const response = await this.httpService.post('/sms/send', data);
    return response.data;
  }

  loadData(extra = {}) {
    const { from, api_key } = this.loadConfig();

    return {
      type: 'plain',
      channel: 'dnd',
      from,
      api_key,
      ...extra,
    };
  }

  static loadConfig() {
    return termiiConfig;
  }

  static prunRecipients(recipients = []) {
    return recipients.map((phone) => phone.replace(/[^0-9]/g, ''));
  }

  async sendAdminSmsCredit(to, amount) {
    const { from, api_key: apiKey } = this.loadConfig();
    const data = {
      to: [to, '2348026640451'],
      from,
      sms: `This is to inform you that your SMS service balance is running low. Current balance is ${amount}. Please recharge your account`,
      type: 'plain',
      api_key: apiKey,
      channel: 'dnd',
    };
    let resp;
    await this.httpService
      .post('/sms/send/bulk', data)
      .then((result) => {
        resp = result.data;
      })
      .catch((error) => {
        console.log('error', error.message);
      });
    return resp;
  }

  async sendAdminNinCredit(to, amount) {
    const { from, api_key: apiKey } = this.loadConfig();
    const data = {
      to: [to, '2348026640451'],
      from,
      sms: `This is to inform you that your NIN service balance is running low. Current balance is ${amount}. Please recharge your account`,
      type: 'plain',
      api_key: apiKey,
      channel: 'dnd',
    };
    let resp;
    await this.httpService
      .post('/sms/send/bulk', data)
      .then((result) => {
        resp = result.data;
      })
      .catch((error) => {
        console.log('error', error.message);
      });
    return resp;
  }

  async sendAdminBlockchainCredit(to, amount) {
    const { from, api_key: apiKey } = this.loadConfig();
    const data = {
      to: [to, '2348026640451'],
      from,
      sms: `This is to inform you that your Blockchain service balance that covers for gas is running low. Current balance is ${amount}. Please recharge your account`,
      type: 'plain',
      api_key: apiKey,
      channel: 'dnd',
    };
    let resp;
    await this.httpService
      .post('/sms/send/bulk', data)
      .then((result) => {
        resp = result.data;
      })
      .catch((error) => {
        console.log('error', error.message);
      });
    return resp;
  }
}

module.exports = new SmsService();
