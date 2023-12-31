const userConst = require('./user.constants');
const userConstFilter = require('./user.constants.filter');
const queuesConst = require('./queues.constant');
const walletConst = require('./wallet.constants');
const fileConst = require('./file.constant')
const countries = require('./countries');
const banks = require('./banks')

module.exports = {

  walletConst,
  queuesConst,
  userConst,
  userConstFilter,
  fileConst,
  ...banks,
  ...countries
}