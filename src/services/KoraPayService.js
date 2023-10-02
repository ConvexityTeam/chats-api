const {encryptKoraPayData} = require('../utils');
const {koraPayConfig} = require('../config');
const axios = require('axios');

const Axios = axios.create();
class KoraPayService {
  static async cardPayment(paymentData) {
    return new Promise(async (resolve, reject) => {
      try {
        const encryptedData = encryptKoraPayData(
          paymentData,
          koraPayConfig.key
        );
        console.log(encryptedData, 'encryptedData');
        const {data} = await Axios.post(
          `${koraPayConfig.baseURL}/merchant/api/v1/charges/card`,
          encryptedData
        );
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = KoraPayService;
