const {createClient} = require('redis')
const axios = require('axios');
const ethers = require("ethers");
const crypto = require("crypto")
const sha256 = require('simple-sha256')
const { tokenConfig, switchWallet } = require("../config");
const { Encryption, Logger } = require("../libs");
const AwsUploadService = require('./AwsUploadService');



const client = createClient();

async function connectRedis(){
  await client.connect();
  client.on('error', (err) => Logger.error("Redis Error"));
}
connectRedis()
const Axios = axios.create();




class BlockchainService {
  static async signInSwitchWallet(){
    return new Promise(async (resolve, reject) => {
      try {
        
        Logger.info("Signing in to switch wallet");
        const { data } = await Axios.post(`${switchWallet.baseURL}/v1/authlock/login`,{
          emailAddress: switchWallet.email,
          password: switchWallet.password
        });
        Logger.info("Signed in to switch wallet");
        resolve(data);
      } catch (error) {
        Logger.error("Create Account Wallet Error", error.response.data);
        reject(error);
      }
    });
  }
  static async switchGenerateAddress(body){
    return new Promise(async (resolve, reject) => {
      try {
        const switch_token = await client.get('switch_token')
        const expires = await client.get('expires')
        if( (expires < new Date()) || expires === null){
         const token = await this.signInSwitchWallet()
         await client.set('expires', token.data.expires)
          await client.set('switch_token', token.data.accessToken);
        }
        Logger.info("Generating wallet address");
        const { data } = await Axios.post(`${switchWallet.baseURL}/v1/walletaddress/generate`,body, {
          headers: {
          Authorization : `Bearer ${switch_token}`
          }
        });
        Logger.info("Generated wallet address");
        resolve(data);
      } catch (error) {
        Logger.error("Error while Generating wallet address", error.response);
        reject(error);
      }
    });
  }
  static async switchWithdrawal(body){
    return new Promise(async (resolve, reject) => {
      try {
        const switch_token = await client.get('switch_token')
        
        if(switch_token !== null && switch_token < new Date()){
         const token = await this.signInSwitchWallet()
          await client.set('switch_token', token.data.accessToken);
        }
        Logger.info("Withdrawing from my account");
        const { data } = await Axios.post(`${switchWallet.baseURL}/merchantClientWithdrawal`,body, {
          headers: {
          Authorization : `Bearer ${switch_token}`
          }
        });
        Logger.info("Withdrawal success");
        resolve(data);
      } catch (error) {
        Logger.error("Error Withdrawing from my account", error.response);
        reject(error);
      }
    });
  }
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
  static async addUser(arg) {
    return new Promise(async (resolve, reject) => {
      try {
        let keyPair = await this.setUserKeypair(arg)
        const { data } = await Axios.post(`${tokenConfig.baseURL}/user/adduser/${keyPair.address}`);
        Logger.info(`Adding User Response: ${JSON.stringify(data)}`);
        resolve(data.AddedUser);
      } catch (error) {
        console.log(error)
        Logger.error(`Adding User Error: ${JSON.stringify(error.response)}`);
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

  

 static async createNewBSCAccount ({ mnemonicString, userSalt })  {
  const Wallet = ethers.Wallet;
    let hash = sha256.sync(mnemonicString);
    let salt = userSalt;
    let buffer = crypto.scryptSync(hash, salt, 32, {
      N: Math.pow(2, 14),
      r: 8,
      p: 1,
    });

    const generatedKeyPair = new Wallet(buffer);
    // const generatedKeyPair = await createPassenger(buffer)
    return generatedKeyPair;
  };

  
static async setUserKeypair(id) {
  let pair = {};
    // TODO: Rebuild user public and private key after retrieving mnemonic key and return account keypair
    try{
      var mnemonic = await AwsUploadService.getMnemonic();
          //console.log(mnemonic,'mnooop')
      mnemonic = JSON.parse(mnemonic);
      pair = await this.createNewBSCAccount({
      mnemonicString: mnemonic.toString(),
      userSalt: id,
    });
    return pair
    }catch(error){
      Logger.error(`Error Creating Wallet Address: ${error} `)
    }
       
    

    
   
    
};
}


module.exports = BlockchainService;
