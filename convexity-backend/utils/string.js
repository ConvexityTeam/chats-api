const randomstring = require("randomstring");

exports.GenearteVendorId = () => {
  const random = randomstring.generate({
    length: 5,
    charset: 'numeric'
  });
  return 'CHATS' + random;
}

exports.generatePaystackRef = () => {
  const random = randomstring.generate({
    length: 30,
    charset: 'alphanumeric',
    capitalization: 'uppercase'
  });

  return 'PAYCHATS' + random;
}