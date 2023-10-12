require('dotenv').config();

module.exports = {
  host: process.env.MAIL_HOST || '',
  port: process.env.MAILport || '',
  user: process.env.MAIL_USERNAME || '',
  pass: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_SENDER || '',
};
