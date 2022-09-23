const {default: axios} = require('axios');
const {termiiConfig} = require('../config');

class SmsService {
  httpService;
  constructor() {
    this.httpService = axios.create({
      baseURL: termiiConfig.baseUrl,
    });
  }

  async sendMessage(recipients, message) {
    const _recipients = Array.isArray(recipients) ? recipients : [recipients];
    const to = this._prunRecipients(_recipients);
    return this.send(to, message);
  }

  async sendOtp(recipients, message) {
    const _recipients = Array.isArray(recipients) ? recipients : [recipients];
    const to = this._prunRecipients(_recipients);
    return this.send(to, message);
  }

  async send(to, sms, channel = 'dnd') {
    const data = this._loadData({to, sms, channel});
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.httpService.post('/sms/send', data);
        console.log('sms sent');
        resolve(response.data);
      } catch (error) {
        console.log('sms error');
        reject(error);
      }
    });
  }

  _loadData(extra = {}) {
    const {from, api_key} = this._loadConfig();

    return {
      type: 'plain',
      channel: 'dnd',
      from,
      api_key,
      ...extra,
    };
  }

  _loadConfig() {
    return termiiConfig;
  }

  _prunRecipients(recipients = []) {
    return recipients.map(phone => phone.replace(/[^0-9]/g, ''));
  }
}

module.exports = new SmsService();
