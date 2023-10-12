require('dotenv').config();
const Web3 = require('web3');

const provider = new Web3.providers.HttpProvider(process.env.blockchainRPC);

const web3 = new Web3(provider);
const { account } = process.env;
const accountPass = process.env.account_pass;
const { contract } = process.env;

const abi = '';

const deployedContract = new web3.eth.Contract(abi, contract);

module.exports = {
  web3,
  deployedContract,
  account,
  accountPass,
};
