const {
  S3
} = require('aws-sdk');
const fs = require('fs');

const {
  accessKeyId,
  secretAccessKey
} = require('../config/aws');

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
}

module.exports = AwsUploadService;