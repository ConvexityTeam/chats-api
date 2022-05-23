require('dotenv').config();

module.exports = {
  clientID: process.env.ZOHO_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  code: process.env.ZOHO_CODE || '',
  url: process.env.ZOHO_BASE_URL
}