const { zohoCrmConfig } = require("../config");

const axios = require('axios');
const Axios = axios.create();

class ZohoService {

    static async generateOAuthToken(){
    return new Promise(async (resolve, reject) => {
      try {
       const {data} = await Axios.post(`https://accounts.zoho.com/oauth/v2/token?response_type=authorization_code&client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&redirect_uri=https://chats.vercel.app`)
        console.log(data, 'data 1')
       resolve(data)
      }catch(error) {
        console.log(error.response)
        reject(error);
      }
    });
  }

  static async generateRefreshToken(){
    return new Promise(async (resolve, reject) => {
      try {
        const refresh = await this.generateOAuthToken()
        const refresh_token = refresh.refresh_token
       const {data} = await Axios.post(`https://accounts.zoho.com/oauth/v2/token?${refresh_token}&${zohoCrmConfig.clientID}&${zohoCrmConfig.clientSecret}&scope=Desk.tickets.READ,Desk.basic.READ&redirect_uri=https://chats.vercel.app&grant_type=${refresh_token}`)
       console.log(data, 'data 2') 
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
       console.log(data, 'data 3')
        resolve(data)
      }catch(error) {
        console.log(error.response)
        reject(error);
      }
    });
  }

}

module.exports = ZohoService