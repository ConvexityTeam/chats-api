require('dotenv').config();

module.exports = {
  baseURL: process.env.TOKEN_BASE_URL || 'https://token.chats.cash/api/v1/web3'
}