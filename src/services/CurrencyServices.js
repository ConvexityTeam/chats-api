require('dotenv').config();
const {default: axios} = require('axios');
const {exchangeRate} = require('../config');
const currencySymbolMap = require('currency-symbol-map');
const currencyCodes = require('currency-codes');

class CurrencyServices { 
  httpService;
  appId;
  exchangeData;
  constructor() {
    // this.httpService = 'https://openexchangerates.org/api';
    // this.appId = process.env.OPEN_EXCHANGE_APP;
    // this.exchangeData = this.getExchangeRate();
  }

  async getCurrencySymbol(currencyCode) {
    const symbol = currencySymbolMap(currencyCode);
    return symbol ? symbol : currencyCode;
  }

  async getExchangeRate() {
    return await this.getExchangeRate();
  }
  async getExchangeRate() {
    return new Promise(async (resolve, reject) => {
      try {
        const url = `${exchangeRate.baseUrl}/latest.json?app_id=${exchangeRate.appId}`;
        const exchange = await axios.get(url);
        this.exchangeData = exchange.data.rates;
        resolve(this.exchangeData);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getSpecificCurrencyExchangeRate(currencyCode) {
    return new Promise(async (resolve, reject) => {
      try {
        const baseCurrency = 'USD';
        const usdUrl = `${exchangeRate.baseUrl}/latest.json?app_id=${exchangeRate.appId}&base=${baseCurrency}&symbols=NGN`;
        const url = `${exchangeRate.baseUrl}/latest.json?app_id=${exchangeRate.appId}&base=${baseCurrency}&symbols=${currencyCode}`;
        const exchangeRateDataUSD = await axios.get(usdUrl);
        const rateDataUSD = exchangeRateDataUSD.data.rates;
        const usdBase = rateDataUSD['NGN'];

        const exchangeRateData = await axios.get(url);
        const rateData = exchangeRateData.data.rates;
        const rate = rateData[currencyCode];
        const currencySymbol = await this.getCurrencySymbol(currencyCode);
        resolve({
          usdBase,
          currencyCode,
          currencySymbol,
          rate
        });
      } catch (error) {
        reject(error);
      }
    });
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
    // console.log('fromRate: ', toRate);
    // console.log(toRate);
    // console.log('toRate: ', fromRate);
    // console.log(fromRate);
    return await this.convertRate(fromRate[1], toRate[1], amount);
  }
  async convertRate(fromRate, toRate, amount) {
    // console.log('fromRate: ', fromRate);
    // console.log('toRate: ', toRate);
    // console.log('amount: ', amount);
    const result = (toRate / fromRate) * amount;
    // console.log('result: ', result.toFixed(2));
    return result;
  }
}

module.exports = new CurrencyServices();
