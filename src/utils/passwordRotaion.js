require('dotenv').config();
const fs = require('fs');
const {Sequelize} = require('sequelize');
const AWS = require('aws-sdk');
const awsConfig = require('../config/aws');
const rdsCert = fs.readFileSync('./rdsCert.pem');
const tls = require('tls');

module.exports = async () => {
  const secretsManager = new AWS.SecretsManager({
    region: awsConfig.region,
    secretAccessKey: awsConfig.secretAccessKey,
    accessKeyId: awsConfig.accessKeyId
  });

  // Specify the name of your secret
  const secretName = awsConfig.rotationKey;

  try {
    // Retrieve the secret value
    const data = await secretsManager
      .getSecretValue({SecretId: secretName})
      .promise();
    const newPassword = JSON.parse(data.SecretString).password;
    const config = {
      username: process.env.DB_USER,
      password: newPassword,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
          ca: [rdsCert],
          checkServerIdentity: (host, cert) => {
            const error = tls.checkServerIdentity(host, cert);
            if (error && !cert.subject.CN.endsWith('.rds.amazonaws.com')) {
              return error;
            }
          }
        }
      },
      dialect: 'postgres'
    };
    const sequelize = new Sequelize(config);
    return sequelize;
  } catch (err) {
    console.error('Error retrieving secret:', err);
    throw err; // Handle the error appropriately in your application
  }
};
