const { LexModelBuildingService } = require('aws-sdk');
var AWS = require('aws-sdk');
const fileSystem = require('fs');
var s3 = new AWS.S3({
    accessKeyId: 'AKIAXMXRLKXC6OR4KFWU',
    secretAccessKey: '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'
});

async function uploadFile(fileName, fileKey, bucket) {
    return new Promise(async function (resolve, reject) {
        const params = {
            Bucket: bucket, // pass your bucket name
            Key: fileKey,
            ACL: 'public-read',
            Body: fileSystem.createReadStream(fileName.path),
            ContentType: fileName.type
        };
        await s3.upload(params, function (s3Err, data) {
            if (s3Err) {
                reject(s3Err);
            } else {
                console.log(`File uploaded successfully at ${data.Location}`);
                resolve(data.Location);
            }
        });
    });
}

module.exports = uploadFile