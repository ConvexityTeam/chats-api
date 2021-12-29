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

exports.generateOrderRef = () => {
  const random = randomstring.generate({
    length: 7,
    charset: 'alphanumeric',
    capitalization: 'uppercase'
  });

  return 'CHATSQRC' + random;
}

exports.generateTransactionRef = () => {
  return randomstring.generate({
    length: 10,
    charset: 'numeric'
  });
}

exports.generateOrganisationId = () => {
  const random = randomstring.generate({
    length: 7,
    charset: 'alphanumeric',
    capitalization: 'uppercase'
  });
  return `CHATSORG${random}`;
}

exports.generateProductRef = () => {
  const random = randomstring.generate({
    length: 7,
    charset: 'alphanumeric',
    capitalization: 'uppercase'
  });

  return `PID${random}`;
}

exports.extractDomain = (address) => {
  return address.toLowerCase()
    .split('://').pop()
    .split('?').shift()
    .split(':').shift()
    .replace('www.');
}