const axios = require('axios');
const {hashicorpConfig} = require('../config');
const Logger = require('../libs/Logger');
const {GenerateSecrete} = require('./string');
const Axios = axios.create();
require('dotenv').config();

// Logger.info(JSON.stringify(hashicorpConfig), 'hashicorpConfig');

const generateClientToken = () => {
  return new Promise(async (resolve, reject) => {
    // Logger.info(JSON.stringify(hashicorpConfig), 'hashicorpConfig');
    try {
      const dataValues = {
        role_id: hashicorpConfig.role_id,
        secret_id: hashicorpConfig.secret_id
      };
      const {data: hashData} = await Axios.post(
        `${hashicorpConfig.address}/v1/auth/approle/login`,
        dataValues,
        {
          headers: {
            'X-Vault-Namespace': hashicorpConfig.namespace
          }
        }
      );
      // console.log(hashData, 'client token');
      resolve(hashData?.auth?.client_token);
    } catch (error) {
      Logger.error(`${error}`, 'error');
      reject(error);
    }
  });
};

exports.encryptData = (secrete, encryptData) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Encrypted data: ${encryptData}`);
      const client_token = await generateClientToken();
      const data = {
        data: {
          ...encryptData
        }
      };
      const {data: encryt} = await Axios.post(
        `${hashicorpConfig.address}/v1/${hashicorpConfig.secretengine}/data/${secrete}`,
        data,
        {
          headers: {
            'X-Vault-Token': client_token,
            'X-Vault-Namespace': hashicorpConfig.namespace
          }
        }
      );
      resolve(encryt);
    } catch (error) {
      Logger.error(`${error?.message}`, 'error');
      reject(error);
    }
  });
};
exports.decryptData = secrete => {
  return new Promise(async (resolve, reject) => {
    try {
      const client_token = await generateClientToken();
      const {data} = await Axios.get(
        `${hashicorpConfig.address}/v1/chats-key/data/${secrete}`,
        {
          headers: {
            'X-Vault-Token': client_token,
            'X-Vault-Namespace': hashicorpConfig.namespace
          }
        }
      );
      resolve(data);
    } catch (error) {
      if (error?.response?.status == 404) {
        const data = this.encryptData(secrete, {
          secretKey: GenerateSecrete()
        });
        resolve(data);
        return;
      }
      console.log(error, 'error');
      reject(error);
    }
  });
};
