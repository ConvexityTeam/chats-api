const {zohoCrmConfig} = require('../config');
const {ZohoToken} = require('../models');
const axios = require('axios');
const {Logger} = require('../libs');

const Axios = axios.create();

function addMinutes(numOfMinutes, date = new Date()) {
  date.setMinutes(date.getMinutes() + numOfMinutes);

  return date;
}

console.log(addMinutes(20));

class ZohoService {
  static async generatingToken() {
    try {
      Logger.info('Generating Zoho Access Token');
      const {data} = await Axios.post(
        `https://accounts.zoho.com/oauth/v2/token?client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&grant_type=authorization_code&code=${zohoCrmConfig.code}`,
      );
      await ZohoToken.create({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: addMinutes(55),
      });
      Logger.info(`Generated Zoho Access And Refresh Token`);
      return data;
    } catch (error) {
      Logger.error(
        `Error Generating Zoho Access And Refresh Token: ${error.response.data}`,
      );
    }
  }

  static async refreshingAccessToken(refresh_token) {
    try {
      Logger.info('Refreshing Token');
      const {data} = await Axios.post(
        `https://accounts.zoho.com/oauth/v2/token?client_id=${zohoCrmConfig.clientID}&client_secret=${zohoCrmConfig.clientSecret}&grant_type=refresh_token&refresh_token=${refresh_token}&scope=${zohoCrmConfig.scope}`,
      );
      const zoho = await ZohoToken.findByPk(1);
      await zoho.update(data);
      Logger.info(`Generated Zoho Code`);
      return data;
    } catch (error) {
      Logger.error(`Error Generating Zoho Code: ${error}`);
      return false;
    }
  }

  static async createTicket(ticket) {
    try {
      const zoho = await ZohoToken.findByPk(1);
      if (new Date() > new Date(zoho.expires_in)) {
        await this.refreshingAccessToken(zoho.refresh_token);
      }

      Logger.info('Creating Zoho Ticket');
      const {data} = await Axios.post(`${zohoCrmConfig.tickets}`, ticket, {
        headers: {
          Authorization: `Bearer ${zoho.access_token}`,
        },
      });
      Logger.info('Created Zoho Ticket');
      return data;
    } catch (error) {
      Logger.error(`Error Creating Zoho Ticket: ${error}`);
    }
  }
}

module.exports = ZohoService;
