require('dotenv').config();

module.exports = {
  clientID: process.env.ZOHO_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_CLIENT_KEY || ''
}