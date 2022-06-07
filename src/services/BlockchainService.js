const { tokenConfig } = require("../config");
const { Encryption, Logger } = require("../libs")
const axios = require('axios');
const { createLogger, format, transports} = require('winston');

const Axios = axios.create();


class BlockchainService {
  static async createAccountWallet() {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info("Create Account Wallet Request");
        const { data } = await Axios.post(`${tokenConfig.baseURL}/user/register`);
        Logger.info("Create Account Wallet Response", data);
        resolve(data.AccountCreated);
      } catch (error) {
        Logger.error("Create Account Wallet Error", error.response.data);
        reject(error);
      }
    });
  }
  static async mintToken(mintTo, amount) {
    return new Promise(async (resolve, reject) => {
     
      try {
        Logger.info('Minting token')
        const payload = {mintTo, amount};
        const checksum = Encryption.encryptTokenPayload(payload);
        const { data } = await Axios.post(`${tokenConfig.baseURL}/txn/mint/${amount}/${mintTo}`, null, {
          headers: {
            'X-CHECKSUM': checksum
          }
        });
        Logger.info('Token minted', data)
        resolve(data);
      } catch (error) {
        Logger.error('Error minting token', error)
        reject(error);
      }
    });
  }

  static async approveToSpend(ngoAddress, ngoPassword, benWallet, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('approving to spend')
        const res = await Axios.post(`${tokenConfig.baseURL}/txn/approve/${ngoAddress}/${ngoPassword}/${benWallet}/${amount}`);
        Logger.info('Approved to spend', res)
        if(res.data)resolve(res.data);
      } catch (error) {
        Logger.error('Error approving to spend', error)
        reject(error.response.data);
      }
    });
  }


  static async transferTo(senderaddr, senderpwsd, receiver,amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Transferring to')
        const res = await Axios.post(`${tokenConfig.baseURL}/txn/transfer/${senderaddr}/${senderpwsd}/${receiver}/${amount}`);
        Logger.info('Success transferring funds to', res.data)
        resolve(res.data);
      } catch (error) {
        Logger.error('Error transferring funds to', error.response.data)
        reject(error.response.data);
      }
    });
  }


  static async transferFrom(tokenowneraddr, to, spenderaddr, spenderpwsd,amount) {

    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Transferring funds from..')
        const res = await Axios.post(`${tokenConfig.baseURL}/txn/transferfrom/${tokenowneraddr}/${to}/${spenderaddr}/${spenderpwsd}/${amount}`);
        Logger.info('Success transferring funds from', res.data)
        if(res.data)resolve(res.data);
      } catch (error) {
        Logger.info('Error transferring funds from', error.response.data)
        reject(error.response.data);
      }
    });
  }


  static async allowance (tokenOwner, spenderAddr){
    return new Promise(async (resolve, reject)=> {
      try{
        const {data} = await Axios.get(`${tokenConfig.baseURL}/account/allowance/${tokenOwner}/${spenderAddr}`);
        resolve(data)
      }catch(error){
        reject(error)
      }
    })
  }


  static async balance (address){
    return new Promise(async (resolve, reject)=> {
      try{
        const {data} = await Axios.get(`${tokenConfig.baseURL}/account/balance/${address}`);
        resolve(data)
      }catch(error){
        reject(error)
      }
    })
  }



  static async redeem (senderaddr, senderpswd, amount){
    const mintTo = senderaddr;
    const payload = {mintTo, amount};
    const checksum = Encryption.encryptTokenPayload(payload);
    return new Promise(async (resolve, reject)=> {
      try{
        Logger.info('Redeeming token')
        const {data} = await Axios.post(`${tokenConfig.baseURL}/txn/redeem/${senderaddr}/${senderpswd}/${amount}`, null, {
          headers: {
            'X-CHECKSUM': checksum
          }
        });
        Logger.info('Success redeeming token', data)
        resolve(data)
      }catch(error){
        Logger.error('Error redeeming token', error.response.data)
        reject(error.response.data);
      }
    })
  }

  
}


module.exports = BlockchainService;
