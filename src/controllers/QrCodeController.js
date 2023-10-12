const QRCode = require('qrcode');

async function codeGenerator(val) {
  return new Promise((resolve, reject) => {
    const value = String(val);
    QRCode.toDataURL(value, (err, url) => {
      if (err) reject(err);
      resolve(url);
    });
  });
}

module.exports = codeGenerator;
