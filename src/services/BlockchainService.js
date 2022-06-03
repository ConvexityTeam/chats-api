const { tokenConfig } = require("../config");
const { Encryption } = require("../libs")
const axios = require('axios');
const { createLogger, format, transports} = require('winston');

const Axios = axios.create();

const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console({})],
});

class BlockchainService {
  static async createAccountWallet() {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info("Create Account Wallet Request");
        const { data } = await Axios.post(`${tokenConfig.baseURL}/user/register`);
        logger.info("Create Account Wallet Response", data);
        resolve(data.AccountCreated);
      } catch (error) {
        logger.error("Create Account Wallet Error", error.response.data);
        reject(error);
      }
    });
  }
  static async mintToken(mintTo, amount) {
    return new Promise(async (resolve, reject) => {
     
      try {
        const payload = {mintTo, amount};
        const checksum = Encryption.encryptTokenPayload(payload);
        const { data } = await Axios.post(`${tokenConfig.baseURL}/txn/mint/${amount}/${mintTo}`, null, {
          headers: {
            'X-CHECKSUM': checksum
          }
        });
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async approveToSpend(ngoAddress, ngoPassword, benWallet, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await Axios.post(`${tokenConfig.baseURL}/txn/approve/${ngoAddress}/${ngoPassword}/${benWallet}/${amount}`);
        if(res.data)resolve(res.data);
      } catch (error) {
        reject(error.response.data);
      }
    });
  }


  static async transferTo(senderaddr, senderpwsd, receiver,amount) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await Axios.post(`${tokenConfig.baseURL}/txn/transfer/${senderaddr}/${senderpwsd}/${receiver}/${amount}`);
        if(res.data)resolve(res.data);
      } catch (error) {
        reject(error.response.data);
      }
    });
  }


  static async transferFrom(tokenowneraddr, to, spenderaddr, spenderpwsd,amount) {

    return new Promise(async (resolve, reject) => {
      try {
        const res = await Axios.post(`${tokenConfig.baseURL}/txn/transferfrom/${tokenowneraddr}/${to}/${spenderaddr}/${spenderpwsd}/${amount}`);
        console.log(res,'transfer')
        if(res.data)resolve(res.data);
      } catch (error) {
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
        const {data} = await Axios.post(`${tokenConfig.baseURL}/txn/redeem/${senderaddr}/${senderpswd}/${amount}`, null, {
          headers: {
            'X-CHECKSUM': checksum
          }
        });
        console.log(data)
        resolve(data)
      }catch(error){
        reject(error.response.data);
      }
    })
  }

  
}


module.exports = BlockchainService;
