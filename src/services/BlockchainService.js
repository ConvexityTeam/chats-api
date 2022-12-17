const {createClient} = require('redis');
const axios = require('axios');
const ethers = require('ethers');
const moment = require('moment');
const crypto = require('crypto');
const sha256 = require('simple-sha256');
const {tokenConfig, switchWallet} = require('../config');
const {SwitchToken} = require('../models');
const {Encryption, Logger} = require('../libs');
const AwsUploadService = require('./AwsUploadService');

const provider = new ethers.providers.getDefaultProvider(
  process.env.BLOCKCHAINSERV
);
const Axios = axios.create();

class BlockchainService {
  static async signInSwitchWallet() {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Signing in to switch wallet');
        const {data} = await Axios.post(
          `${switchWallet.baseURL}/v1/authlock/login`,
          {
            emailAddress: switchWallet.email,
            password: switchWallet.password
          }
        );
        const token = data.data;
        const exist = await SwitchToken.findByPk(1);

        if (!exist) await SwitchToken.create({...token});
        else await exist.update({...token});
        Logger.info('Signed in to switch wallet');
        resolve(data);
      } catch (error) {
        Logger.error('Create Account Wallet Error: ' + JSON.stringify(error));
        reject(error);
      }
    });
  }
  static async switchGenerateAddress(body) {
    return new Promise(async (resolve, reject) => {
      try {
        const token = await SwitchToken.findByPk(1);
        console.log(token);
        if (!token || moment().isAfter(token.expires)) {
          await this.signInSwitchWallet();
        }
        Logger.info('Generating wallet address');
        const {data} = await Axios.post(
          `${switchWallet.baseURL}/v1/walletaddress/generate`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`
            }
          }
        );
        Logger.info('Generated wallet address');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error while Generating wallet address: ${JSON.stringify(error)}`
        );
        reject(error);
      }
    });
  }
  static async switchWebhook(data) {
    return Promise(async (resolve, reject) => {
      try {
        const token = await SwitchToken.findByPk(1);
        if (!token || moment().isAfter(token.expires)) {
          await this.signInSwitchWallet();
        }
        console.log(token);
        const {data} = await Axios.put(
          `${switchWallet.baseURL}/v1/merchant/webhook`,
          {webhookUrl: '', publicKey: switchWallet.publicKey},
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`
            }
          }
        );
        resolve(data);
      } catch (error) {
        Logger.error(`Error Verifying webhook: ${JSON.stringify(error)}`);
        reject(error);
      }
    });
  }
  static async switchWithdrawal(body) {
    return new Promise(async (resolve, reject) => {
      try {
        const switch_token = await client.get('switch_token');

        if (switch_token !== null && switch_token < new Date()) {
          const token = await this.signInSwitchWallet();
          await client.set('switch_token', token.data.accessToken);
        }
        Logger.info('Withdrawing from my account');
        const {data} = await Axios.post(
          `${switchWallet.baseURL}/merchantClientWithdrawal`,
          body,
          {
            headers: {
              Authorization: `Bearer ${switch_token}`
            }
          }
        );
        Logger.info('Withdrawal success');
        resolve(data);
      } catch (error) {
        Logger.error('Error Withdrawing from my account', error.response);
        reject(error);
      }
    });
  }

  static async confirmTransaction(hash) {
    return new Promise(async (resolve, reject) => {
      Logger.info('base_url: ' + process.env.POLYGON_BASE_URL);
      try {
        Logger.info('Confirming transaction');
        const txReceipt = await provider.getTransactionReceipt(hash);
        Logger.info('Transaction confirmed');
        // const {data} = await Axios.get(
        //   `https://${process.env.POLYGON_BASE_URL}/api?module=transaction&action=gettxreceiptstatus&txhash=${hash}&apikey=${process.env.POLYGON_API_KEY}`
        // );
        resolve(txReceipt);
      } catch (error) {
        Logger.error(`Error confirming transaction: ${error}`);
        reject(error);
      }
    });
  }
  static async createAccountWallet() {
    try {
      Logger.info('Create Account Wallet Request');
      const {data} = await Axios.post(`${tokenConfig.baseURL}/user/register`);
      Logger.info('Create Account Wallet Response', data);
      return true;
    } catch (error) {
      Logger.error('Create Account Wallet Error', error.response.data);
      return false;
    }
  }
  static async addUser(arg) {
    return new Promise(async (resolve, reject) => {
      try {
        let keyPair = await this.setUserKeypair(arg);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/user/adduser/${keyPair.address}`
        );
        Logger.info(`User Added`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `Adding User Error: ${JSON.stringify(error.response.data)}`
        );
        reject(error);
      }
    });
  }
  static async mintToken(mintTo, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Minting token');
        const payload = {mintTo, amount};
        const checksum = Encryption.encryptTokenPayload(payload);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/mint/${amount}/${mintTo}`,
          null,
          {
            headers: {
              'X-CHECKSUM': checksum
            }
          }
        );
        Logger.info('Token minted', data);
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error minting token: ${JSON.stringify(error.response.data)}`
        );
        reject(error);
      }
    });
  }
  static async redeem(senderpswd, amount) {
    return new Promise(async (resolve, reject) => {
      const mintTo = senderpswd;
      const payload = {mintTo, amount};
      const checksum = Encryption.encryptTokenPayload(payload);
      try {
        Logger.info('Redeeming token');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/redeem/${senderpswd}/${amount}`,
          null,
          {
            headers: {
              'X-CHECKSUM': checksum
            }
          }
        );
        Logger.info('Success redeeming token');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error redeeming token: ` + JSON.stringify(error.response.data)
        );
        reject(error);
      }
    });
  }

  static async approveToSpend(ownerPassword, spenderAdd, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('approving to spend');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/approve/${ownerPassword}/${spenderAdd}/${amount}`
        );
        Logger.info('Approved to spend');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error approving to spend: ${JSON.stringify(error.response.data)}`
        );
        reject(error);
      }
    });
  }

  static async disApproveToSpend(ownerPassword, spenderAdd, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('disapproving to spend');
        const res = await Axios.post(
          `${tokenConfig.baseURL}/txn/disapprove/${ownerPassword}/${spenderAdd}/${amount}`
        );
        Logger.info('Disapproved to spend');
        resolve(res);
      } catch (error) {
        Logger.error(
          `Error disapproving to spend: ${JSON.stringify(error.response.data)}`
        );
        reject(error);
      }
    });
  }

  static async transferTo(senderPass, receiverAdd, amount) {
    //Logger.info(senderaddr, senderpwsd, receiver, amount);
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Transferring to campaign wallet');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/transfer/${senderPass}/${receiverAdd}/${amount}`
        );
        Logger.info('Transferred to campaign wallet');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error transferring to campaign wallet: ${JSON.stringify(
            error.response.data
          )}`
        );
        reject(error);
      }
    });
  }

  static async transferFrom(tokenownerAdd, receiver, spenderPass, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Transferring funds from..');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/transferfrom/${tokenownerAdd}/${receiver}/${spenderPass}/${amount}`
        );
        Logger.info('Success transferring funds from');
        resolve(data);
      } catch (error) {
        Logger.info(
          `Error transferring funds from:  ${
            error.response ? JSON.stringify(error.response.data) : error
          } `
        );
        reject(error);
      }
    });
  }

  static async allowance(tokenOwner, spenderAddr) {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await Axios.get(
          `${tokenConfig.baseURL}/account/allowance/${tokenOwner}/${spenderAddr}`
        );
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async balance(address) {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await Axios.get(
          `${tokenConfig.baseURL}/account/balance/${address}`
        );
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async redeemx(senderpswd, amount) {
    Logger.info(senderpswd);

    return new Promise(async (resolve, reject) => {
      const mintTo = senderaddr;
      const payload = {mintTo, amount};
      const checksum = Encryption.encryptTokenPayload(payload);
      try {
        Logger.info('Redeeming token');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/redeem/${senderpswd}/${amount}`,
          null,
          {
            headers: {
              'X-CHECKSUM': checksum
            }
          }
        );
        Logger.info('Success redeeming token');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error redeeming token: ` + JSON.stringify(error.response.data)
        );
        reject(error);
      }
    });
  }

  static async createNewBSCAccount({mnemonicString, userSalt}) {
    const Wallet = ethers.Wallet;
    let hash = sha256.sync(mnemonicString);
    let salt = userSalt;
    let buffer = crypto.scryptSync(hash, salt, 32, {
      N: Math.pow(2, 14),
      r: 8,
      p: 1
    });

    const generatedKeyPair = new Wallet(buffer);
    // const generatedKeyPair = await createPassenger(buffer)
    return generatedKeyPair;
  }

  static async setUserKeypair(id) {
    let pair = {};
    // TODO: Rebuild user public and private key after retrieving mnemonic key and return account keypair
    try {
      var mnemonic = await AwsUploadService.getMnemonic();
      mnemonic = JSON.parse(mnemonic);

      pair = await this.createNewBSCAccount({
        mnemonicString: mnemonic.toString(),
        userSalt: id
      });
      return pair;
    } catch (error) {
      Logger.error(`Error Creating Wallet Address: ${error} `);
    }
  }
}

module.exports = BlockchainService;
