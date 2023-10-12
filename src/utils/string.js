const randomstring = require('randomstring');

exports.generateRandom = (length = 6) => randomstring.generate({ length });

exports.GenerateSecrete = () => {
  let result = '';
  const characters = 'ABCDEFGHJKMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  const charactersLength = characters.length;
  for (let i = 0; i < 23; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.GenerateUserId = () => {
  let result = '';
  const characters = 'ABCDEFGHJKMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  const charactersLength = characters.length;
  for (let i = 0; i < 10; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.GenerateOtp = () => {
  const random = randomstring.generate({
    length: 6,
    charset: 'numeric',
  });
  return random;
};

exports.GenerateVendorOtp = () => {
  const random = randomstring.generate({
    length: 4,
    charset: 'numeric',
  });
  return random;
};

exports.GenearteVendorId = () => {
  const random = randomstring.generate({
    length: 5,
    charset: 'numeric',
  });
  return `CHATS${random}`;
};

exports.GenearteSMSToken = () => {
  let result = '';
  const characters = 'ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 8; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.GenerateSwitchRef = () => {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 8; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.generatePaystackRef = () => {
  const random = randomstring.generate({
    length: 30,
    charset: 'alphanumeric',
    capitalization: 'uppercase',
  });

  return `PAYCHATS${random}`;
};

exports.generateOrderRef = () => {
  const random = randomstring.generate({
    length: 7,
    charset: 'alphanumeric',
    capitalization: 'uppercase',
  });

  return `CHATSQRC${random}`;
};

exports.generateTransactionRef = () => randomstring.generate({
  length: 10,
  charset: 'numeric',
});

exports.generateOrganisationId = () => {
  const random = randomstring.generate({
    length: 7,
    charset: 'alphanumeric',
    capitalization: 'uppercase',
  });
  return `CHATSORG${random}`;
};

exports.generateProductRef = () => {
  const random = randomstring.generate({
    length: 7,
    charset: 'alphanumeric',
    capitalization: 'uppercase',
  });

  return `PID${random}`;
};

exports.extractDomain = (address) => address
  .toLowerCase()
  .split('://')
  .pop()
  .split('?')
  .shift()
  .split(':')
  .shift()
  .replace('www.');
