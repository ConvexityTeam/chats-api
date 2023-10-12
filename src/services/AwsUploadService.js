const { S3 } = require('aws-sdk');
const fs = require('fs');
const SecretsManager = require('aws-sdk/clients/secretsmanager');
const { Logger } = require('../libs');
const { awsConfig } = require('../config');

const { accessKeyId, secretAccessKey } = require('../config/aws');
const { GenerateSecrete } = require('../utils');

const client = new SecretsManager({
  region: awsConfig.region,
  secretAccessKey: awsConfig.secretAccessKey,
  accessKeyId: awsConfig.accessKeyId,
});

const AwsS3 = new S3({
  accessKeyId,
  secretAccessKey,
});

class AwsUploadService {
  static async uploadFile(file, fileKey, awsBucket, acl = 'public-read') {
    return new Promise((resolve, reject) => {
      AwsS3.upload(
        {
          Bucket: awsBucket,
          Key: fileKey,
          ACL: acl,
          Body: fs.createReadStream(file.path),
          ContentType: file.type,
        },
        (err, data) => {
          if (err) {
            reject(err);
          }
          if (data) {
            fs.unlinkSync(file.path);
            resolve(data.Location);
          }
        },
      );
    });
  }

  static async createSecret(id) {
    const params = {
      Name: awsConfig.campaignSecretName + id,
      Description: 'Unique secrete for each campaign',
      SecretString: GenerateSecrete(),
    };
    // xOC&*wPo3jgCcDVkd)rdQAN
    try {
      const secret = client.createSecret(params, (err, data) => {
        if (!err) return data;
        throw new Error(err.stack);
      });
      return secret;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  static async describeSecret() {
    const params = {
      SecretId: 'Unique Campaign Secret ID',
    };
    try {
      client.createSecret(params, (error, data) => {
        if (!error) {
          return data;
        }
        throw new Error(error.stack);
      });
    } catch (error) {
      console.log(error);
    }
  }

  static async getMnemonic(id) {
    // const { SecretsManager } = AWS;
    // id  ? awsConfig.campaignSecretName + id
    const secretName = awsConfig.secreteName;
    let secret;
    let decodedBinarySecret;
    // Create a Secrets Manager client

    // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    // We rethrow the exception by default.
    try {
      const data = await client
        .getSecretValue({ SecretId: secretName })
        .promise()
        .then((response) => {
          if ('SecretString' in response) {
            secret = response.SecretString;
            return secret;
          }
          const buff = Buffer.from(response.SecretBinary, 'base64');
          decodedBinarySecret = buff.toString('ascii');
          return decodedBinarySecret;
        });
      return data;
    } catch (err) {
      if (err.code === 'DecryptionFailureException') {
        Logger.error(
          'Secrets Manager can\'t decrypt the protected secret text using the provided KMS key.',
        );
        throw err;
      } else if (err.code === 'InternalServiceErrorException') {
        Logger.error('An error occurred on the server side.');
        throw err;
      } else if (err.code === 'InvalidParameterException') {
        Logger.error('You provided an invalid value for a parameter.');
        throw err;
      } else if (err.code === 'InvalidRequestException') {
        Logger.error(
          'You provided a parameter value that is not valid for the current state of the resource',
        );
        throw err;
      } else if (err.code === 'ResourceNotFoundException') {
        Logger.error('We can\'t find the resource that you asked for.');
        if (id) {
          // this.createSecret(id);
        } else throw err;
      }
      Logger.error(`Error decrypting : ${err}`);
    }
    return null;
  }
}

module.exports = AwsUploadService;
