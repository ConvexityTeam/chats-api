const { zohoCrmConfig } = require("../config");
const ZohoClient = require('@zohocrm/nodejs-sdk-2.0')
const axios = require('axios');
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

    static async generateOAuthToken(){
    return new Promise(async (resolve, reject) => {
      try {
       const {data} = await Axios.post(`https://accounts.zoho.com/oauth/v2/token&grant_type=authorization_code&client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&redirect_uri=https://chats.vercel.app`)
        console.log(data,'ticket')
       resolve(data)
      }catch(error) {
        console.log(error,'error')
        reject(error.response);
      }
    });
  }

  static async generateRefreshToken(){
    return new Promise(async (resolve, reject) => {
      try {
        const refresh = await this.generateOAuthToken()
        const refresh_token = refresh.refresh_token
       const {data} = await Axios.post(`https://accounts.zoho.com/oauth/v2/token?${refresh_token}&${zohoCrmConfig.clientID}&${zohoCrmConfig.clientSecret}&scope=Desk.tickets.READ,Desk.basic.READ&redirect_uri=https://chats.vercel.app&grant_type=${refresh_token}`)
       
       resolve(data)
      }catch(error) {
        console.log(error.response)
        reject(error);
      }
    });
  }
  static async createTicket(subject, description, phone, email){
    return new Promise(async (resolve, reject) => {
      try {
        const refresh = await this.generateRefreshToken()
        const access_token = refresh.access_token
       const {data} = await Axios.post(`https://desk.zoho.com/api/v1/tickets`,{subject, description, phone, email},{
         
       headers: {
            'Authorization': `Zoho-oauthtoken ${access_token}`
          }
       })
       
        resolve(data)
      }catch(error) {
        console.log(error.response)
        reject(error);
      }
    });
  }

}

module.exports = ZohoService
