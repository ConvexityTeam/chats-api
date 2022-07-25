const { zohoCrmConfig } = require("../config");
const ZohoClient = require('@zohocrm/nodejs-sdk-2.0')
const axios = require('axios');
const {
  Logger
} = require('../libs');
const Axios = axios.create();

class ZohoService {

  static async zohiInitializer(){
    let config = {
      client_id: '',
      client_secret: ''
    }
    return new Promise(async (resolve, reject) => {
      try {
       const ZohoInit =  new ZohoClient.Initializer()
        console.log(ZohoInit,'ZohoInit')
       resolve(ZohoInit)
      }catch(error) {
        console.log(error,'error zoho')
        reject(error);
      }
    });
  }

    static async generateAccessToken(){
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Genereting Zoho Access Token');
       const {data} = await Axios.post(`${zohoCrmConfig.base}?scope=${zohoCrmConfig.scope}&client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&grant_type=authorization_code&code=${zohoCrmConfig.code}&redirect_uri=${zohoCrmConfig.redirect_uri}`)
       Logger.info(`Genereted Zoho Access Token: ${data}`);
       resolve(data)
      }catch(error) {
        Logger.error(`Error Genereting Zoho Access Token: ${error}`);
        reject(error.response);
      }
    });
  }

  static async generateRefreshToken(){
    return new Promise(async (resolve, reject) => {
      try {
        const refresh = await ZohoService.generateOAuthToken()
        const refresh_token = refresh.refresh_token
        Logger.info('Genereting Zoho Refresh Token');
       const {data} = await Axios.post(`${zohoCrmConfig.base}?refresh_token=${refresh_token}&client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&grant_type=refresh_token`)
       Logger.info('Genereed Zoho Refresh Token');
       resolve(data)
      }catch(error) {
        Logger.error(`Error Genereting Zoho Refresh Token: ${error}`);
        reject(error.response);
      }
    });
  }
  static async createTicket(subject, description, phone, email){
    return new Promise(async (resolve, reject) => {
      try {

        const refresh = await ZohoService.generateRefreshToken()
        const access_token = refresh.access_token
        Logger.info('Creating Zoho Ticket');
       const {data} = await Axios.post(`${zohoCrmConfig.tickets}`,{subject, description, phone, email},{
         
       headers: {
            'Authorization': `Zoho-oauthtoken ${access_token}`
          }
       })
       Logger.info('Created Zoho Ticket');
        resolve(data)
      }catch(error) {
        Logger.error(`Error Creatingng Zoho Ticket: ${error}`);
        reject(error);
      }
    });
  }

}

module.exports = ZohoService
