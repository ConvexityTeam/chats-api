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
  static async zohoInit(){
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Generating Zoho Access Token');
       const {data} = await Axios.post(`${zohoCrmConfig.base}/auth?scope=${zohoCrmConfig.scope}&client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&response_type=code&redirect_uri=${zohoCrmConfig.redirect_uri}&prompt=consent`)
       Logger.info(`Generated Zoho Code`);
       resolve(data)
      }catch(error) {
        Logger.error(`Error Generating Zoho Code: ${error}`);
        reject(error.response);
      }
    });
  }

    static async generateAccessToken(){
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Generating Zoho Access Token');
       const {data} = await Axios.post(`${zohoCrmConfig.base}/token?client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&grant_type=authorization_code&redirect_uri=${zohoCrmConfig.redirect_uri}&code=1000.b86f79013f525b5df00163a70a933662.2c719b6e77738cfc032ae5d34b9f0c93`)
       Logger.info(`Generated Zoho Code`);
       resolve(data)
      }catch(error) {
        Logger.error(`Error Generating Zoho Code: ${error}`);
        reject(error.response);
      }
    });
  }


  static async generateRefreshToken(code){
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Generating Zoho Refresh Token');
       const {data} = await Axios.post(`${zohoCrmConfig.base}/token/revoke?token=1000.f9672648350b699645c6357470fc56ba.f4359a4e779b0e2e13b681359967bb11`)
       Logger.info('Generated Zoho Refresh Token');
       resolve(data)
      }catch(error) {
        Logger.error(`Error Generating Zoho Refresh Token: ${error}`);
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
