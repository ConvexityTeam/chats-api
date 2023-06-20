require('dotenv').config();
const {default: axios} = require('axios');

class CurrencyServices {
  httpService;
  appId;
  exchangeData;
  constructor() {
    // this.httpService = 'https://openexchangerates.org/api';
    // this.appId = process.env.OPEN_EXCHANGE_APP;
    this.exchangeData = this.getExchangeRate();
  }

  async getExchangeRate() {
    return await this.getExchangeRate();
  }
  async getExchangeRate() {
    // const appId = process.env.OPEN_EXCHANGE_APP;
    // console.log(appId);
    const url = `https://openexchangerates.org/api/latest.json?app_id=da41a176c0874c4498594d728d2aa4ca`;
    const exchange = await axios.get(url);
    this.exchangeData = exchange.data.rates;
    return this.exchangeData;
  }

  async convertCurrency(fromCurrency, toCurrency, amount) {
    const data = await this.getExchangeRate();
    const currencies = Object.entries(data);
    // get rate of from origin currency
    const fromRate = currencies.find(row => {
      return row[0] == fromCurrency;
    });
    // get rate of to destination currency
    const toRate = currencies.find(row => {
      return row[0] == toCurrency;
    });
    return this.convertRate(fromRate[1], toRate[1], amount);
  }
  async convertRate(fromRate, toRate, amount) {
    return ((toRate / fromRate) * amount).toFixed(2);
  }
}

module.exports = new CurrencyServices();
