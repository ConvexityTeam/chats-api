require('dotenv').config();

module.exports = {
  clientID: process.env.ZOHO_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  code: process.env.ZOHO_CODE || '',
  base: process.env.ZOHO_BASE_URL,
  scope:process.env.ZOHO_SCOPE,
  redirect_uri: 'https://chats.vercel.app/support'
}