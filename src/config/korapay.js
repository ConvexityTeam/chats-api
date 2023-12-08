require('dotenv').config();

module.exports = {
  baseUrl: process.env.KORA_PAY_BASE_URL,
  secret_key: process.env.KORA_PAY_SECRET_KEY,
  pub_key: process.env.KORA_PAY_PUB_KEY,
  key: process.env.KORA_PAY_KEY
};
