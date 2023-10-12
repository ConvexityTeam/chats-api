require('dotenv').config();
const AWS = require('aws-sdk');
const fileSystem = require('fs');
const { Logger } = require('../libs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

function uploadFile(fileName, fileKey, bucket) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucket,
      Key: fileKey,
      ACL: 'public-read',
      Body: fileName.path ? fileSystem.createReadStream(fileName.path) : fileName,
      ContentType: fileName.type,
    };

    s3.upload(params, (s3Err, data) => {
      Logger.info(`secrete ID: ${process.env.AWS_ACCESS_KEY_ID}`);
      Logger.info(`secrete key: ${process.env.AWS_SECRET_ACCESS_KEY}`);

      if (s3Err) {
        console.log(s3Err, 'err');
        reject(s3Err);
      } else {
        console.log(`File uploaded successfully at ${data.Location}`);
        resolve(data.Location);
      }
    });
  });
}

module.exports = uploadFile;
