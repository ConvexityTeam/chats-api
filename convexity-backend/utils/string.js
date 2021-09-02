const randomstring = require("randomstring");

exports.GenearteVendorId = () => {
  const random = randomstring.generate({
    length: 5,
    charset: 'numeric'
  });
  return 'CHATS' + random;
}