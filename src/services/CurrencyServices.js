require('dotenv').config();
const {default: axios} = require('axios');

class CurrencyServices {
  httpService;
  appId;
  constructor() {
    // this.httpService = 'https://openexchangerates.org/api';
    // this.appId = process.env.OPEN_EXCHANGE_APP;
  }

  static async getExchangeRate() {
    // const appId = process.env.OPEN_EXCHANGE_APP;
    // console.log(appId);
    const url = `https://openexchangerates.org/api/latest.json?app_id=da41a176c0874c4498594d728d2aa4ca`;
    const exchange = await axios.get(url);
    // console.log(exchange.data.rates);
    return exchange.data.rates;
  }

  static async convertCurrency(from, to, amount) {
    const params = {params: {app_id: 'da41a176c0874c4498594d728d2aa4ca'}};
    const url = `https://openexchangerates.org/api/convert/${amount}/${from}/${to}`;
    let converted = await axios.get(url, params);
    console.log(converted.data);
    return converted;
  }
}

module.exports = CurrencyServices;
