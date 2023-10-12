require('dotenv').config();
const { default: axios } = require('axios');
const currencySymbolMap = require('currency-symbol-map');
const { exchangeRate } = require('../config');

class CurrencyServices {
  httpService;

  appId;

  exchangeData;

  // constructor() {
  //   // this.httpService = 'https://openexchangerates.org/api';
  //   // this.appId = process.env.OPEN_EXCHANGE_APP;
  //   // this.exchangeData = this.getExchangeRate();
  // }

  static async getCurrencySymbol(currencyCode) {
    const symbol = currencySymbolMap(currencyCode);
    return symbol || currencyCode;
  }

  // async getExchangeRate() {
  //   return await this.getExchangeRate();
  // }

  async getExchangeRate() {
    return new Promise((resolve) => {
      const url = `${exchangeRate.baseUrl}/latest.json?app_id=${exchangeRate.appId}`;
      axios.get(url).then((exchange) => {
        this.exchangeData = exchange.data.rates;
        resolve(this.exchangeData);
      });
    });
  }

  async getSpecificCurrencyExchangeRate(currencyCode) {
    const baseCurrency = 'USD';
    const usdUrl = `${exchangeRate.baseUrl}/latest.json?app_id=${exchangeRate.appId}&base=${baseCurrency}&symbols=NGN`;
    const url = `${exchangeRate.baseUrl}/latest.json?app_id=${exchangeRate.appId}&base=${baseCurrency}&symbols=${currencyCode}`;
    const exchangeRateDataUSD = await axios.get(usdUrl);
    const rateDataUSD = exchangeRateDataUSD.data.rates;
    const usdBase = rateDataUSD.NGN;

    const exchangeRateData = await axios.get(url);
    const rateData = exchangeRateData.data.rates;
    const rate = rateData[currencyCode];
    const currencySymbol = await this.getCurrencySymbol(currencyCode);
    return {
      usdBase,
      currencyCode,
      currencySymbol,
      rate,
    };
  }

  async convertCurrency(fromCurrency, toCurrency, amount) {
    const data = await this.getExchangeRate();
    const currencies = Object.entries(data);
    // get rate of from origin currency
    const fromRate = currencies.find((row) => row[0] === fromCurrency);
    // get rate of to destination currency
    const toRate = currencies.find((row) => row[0] === toCurrency);
    // console.log('fromRate: ', toRate);
    // console.log(toRate);
    // console.log('toRate: ', fromRate);
    // console.log(fromRate);
    const response = await this.convertRate(fromRate[1], toRate[1], amount);
    return response;
  }

  static async convertRate(fromRate, toRate, amount) {
    // console.log('fromRate: ', fromRate);
    // console.log('toRate: ', toRate);
    // console.log('amount: ', amount);
    const result = (toRate / fromRate) * amount;
    // console.log('result: ', result.toFixed(2));
    return result;
  }
}

module.exports = new CurrencyServices();
