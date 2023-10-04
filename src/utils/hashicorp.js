const axios = require('axios');
const {hashicorpConfig} = require('../config');
const Axios = axios.create();

module.exports.generateClientToken = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const {data} = await Axios.post(
        `${hashicorpConfig.address}/v1/auth/approle/login`,
        null,
        {
          headers: {
            'X-Vault-Namespace': 'application/json'
          },
          auth: {
            username: hashicorpConfig.role_id,
            password: hashicorpConfig.secret_id
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};
