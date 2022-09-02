const {
  S3
} = require('aws-sdk');
const fs = require('fs');

const { awsConfig } = require("../config");
const SecretsManager = require("aws-sdk/clients/secretsmanager");

const {
  accessKeyId,
  secretAccessKey
} = require('../config/aws');

const client = new SecretsManager({
    region: awsConfig.region,
    secretAccessKey: awsConfig.secretAccessKey,
    accessKeyId: awsConfig.accessKeyId, 
  });

const AwsS3 = new S3({
  accessKeyId,
  secretAccessKey
});
class AwsUploadService {
  static async uploadFile(file, fileKey, awsBucket, acl = 'public-read') {
    return new Promise(async (resolve, reject) => {
      AwsS3.upload({
        Bucket: awsBucket,
        Key: fileKey,
        ACL: acl,
        Body: fs.createReadStream(file.path),
        ContentType: file.type,
      }, (err, data) => {
        err && reject(err);
        if(data) {
          fs.unlinkSync(file.path);
          resolve(data.Location);
        }
      })
    })
  }
  static async getMnemonic () {

  // const { SecretsManager } = AWS;
   var secretName = awsConfig.secreteName,
    secret,
    decodedBinarySecret;
  // Create a Secrets Manager client
  

  // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
  // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
  // We rethrow the exception by default.
return await client
    .getSecretValue({ SecretId: secretName }) 
    .promise()
    .then((data) => {
      // Decrypts secret using the associated KMS key.
      // Depending on whether the secret is a string or binary, one of these fields will be populated.
      if ("SecretString" in data) {
        secret = data.SecretString;
        return secret;
      } else {
        let buff = new Buffer(data.SecretBinary, "base64");
        decodedBinarySecret = buff.toString("ascii");
        return decodedBinarySecret;
      }
    })
    .catch((err) => {

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
    }); 

};

}

module.exports = AwsUploadService;