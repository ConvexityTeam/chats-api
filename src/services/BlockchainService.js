const axios = require('axios');
const ethers = require("ethers");
const crypto = require("crypto")
const sha256 = require('simple-sha256')
const { tokenConfig,awsConfig } = require("../config");
const { Encryption, Logger } = require("../libs")
const SecretsManager = require("aws-sdk/clients/secretsmanager");

const Axios = axios.create();
const client = new SecretsManager({
    region: awsConfig.region,
    secretAccessKey: awsConfig.secretAccessKey,
    accessKeyId: awsConfig.accessKeyId, 
  });

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
  static async addUser(address) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info("Adding User Request");
        const { data } = await Axios.post(`${tokenConfig.baseURL}/user/adduser/${address}`);
        Logger.info("Adding User Response");
        resolve(data.AccountCreated);
      } catch (error) {
        Logger.error("Adding User Error", error.response.data);
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

  static async getMnemonic (hello) {

  // const { SecretsManager } = AWS;
   var secretName = awsConfig.secreteName,
    secret,
    decodedBinarySecret;
  // Create a Secrets Manager client
  

  // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
  // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
  // We rethrow the exception by default.
  client.getSecretValue({ SecretId: secretName }, function (err, data) {
  if (err) {
    console.log(err);
    if (err.code === "DecryptionFailureException")
      // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "InternalServiceErrorException")
      // An error occurred on the server side.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "InvalidParameterException")
      // You provided an invalid value for a parameter.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "InvalidRequestException")
      // You provided a parameter value that is not valid for the current state of the resource.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "ResourceNotFoundException")
      // We can't find the resource that you asked for.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
  } else {
    // Decrypts secret using the associated KMS CMK.
    // Depending on whether the secret is a string or binary, one of these fields will be populated.
    if ("SecretString" in data) {
      secret = data.SecretString;
      console.log(secret);
    } else {
      let buff = new Buffer.from(JSON.stringify(data.SecretBinary), "base64");
      decodedBinarySecret = buff.toString("ascii");
      console.log(secret);
    }
  }
});
};

static async setUserKeypair(email) {
  let pair = {};

    // TODO: Rebuild user public and private key after retrieving mnemonic key and return account keypair
    var mnemonic = await getMnemonic();
    mnemonic = JSON.parse(mnemonic);   

    pair = await createNewBSCAccount({
      mnemonicString: mnemonic.toString(),
      userSalt: email,
    });

    return pair;
};
}


module.exports = BlockchainService;
