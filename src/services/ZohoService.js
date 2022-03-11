const zohoCRM = require('@zohocrm/nodejs-sdk-2.0')

const axios = require('axios');
const Axios = axios.create();

class ZohoService {

    static createTicket(){
    return new Promise(async (resolve, reject) => {
      try {
       await zohoCRM.Initializer()
       await zohoCRM.MasterModel()
      } catch (error) {
        console.log(error.response)
        reject(error);
      }
    });
  }

}

module.exports = ZohoService