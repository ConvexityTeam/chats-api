const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { createHash, GenerateOtp } = require('../utils');
const { User, OneTimePassword, Invites } = require('../models');
const {
  generate2faSecret,
  verify2faToken,
  GenerateVendorOtp,
} = require('../utils');
const MailerService = require('./MailerService');
const UserService = require('./UserService');
const SmsService = require('./SmsService');
const CurrencyServices = require('./CurrencyServices');

// const Vault = require('hashi-vault-js');

// const vault = new Vault({
//   https: true,
//   baseUrl: '172.25.16.0/v1',
//   rootPath: 'secret',
//   timeout: 5000,
//   proxy: false
// });

// async function func() {
//   const token = await vault.loginWithUserpass(
//     process.env.VAULT_USER,
//     process.env.VAULT_PASS
//   ).client_token;
//   return token;
// }

class AuthService {
  static async login(data, _password, roleId = null) {
    const error = new Error();
    return new Promise((resolve, reject) => {
      if (data) {
        const { password, tfa_secret: tfaSecret, ...user } = data.toJSON();

        if (bcrypt.compareSync(_password, password)) {
          if (user.status === 'suspended') {
            error.status = 401;
            error.message = 'Account Suspended. Contact Support.';
            reject(error);
            return;
          }

          if (roleId && user.RoleId !== roleId) {
            error.status = 401;
            error.message = 'Unathorized access.';
            reject(error);
            return;
          }
          const uid = user.id;
          const oids = user.AssociatedOrganisations.map(
            (assoc) => assoc.OrganisationId,
          );
          const token = jwt.sign(
            {
              uid,
              oids,
            },
            process.env.SECRET_KEY,
            {
              expiresIn: '48hr',
            },
          );

          // for (const key in currencyData) {
          //   if (currencyData.hasOwnProperty(key)) {
          //     user[key] = currencyData[key];
          //   }
          // }

          resolve({
            user,
            token,
          });
        }
        error.status = 401;
        error.message = 'Invalid login credentials';
        reject(error);
      } else {
        error.status = 401;
        error.message = 'Invalid login credentials';
        reject(error);
      }
    });
  }

  static async add2faSecret(user, tfaMethod) {
    return new Promise((resolve, reject) => {
      let qrcodeData;
      generate2faSecret()
        .then((_data) => {
          qrcodeData = _data;
          return User.update(
            { tfa_secret: _data.secret },
            { where: { id: user.id } },
          );
        })
        .then(() => {
          if (tfaMethod === 'sms') {
            SmsService.send(
              user.phone,
              `2AF Verification Code: ${qrcodeData.code}`,
            );
            delete qrcodeData.qrcode_url;
            delete qrcodeData.code;
            return resolve(qrcodeData);
          }
          if (tfaMethod === 'email') {
            MailerService.sendMail(
              user.email,
              `2AF Verification Code: ${qrcodeData.code}`,
              `<h1>2AF Verification Code: ${qrcodeData.code}</h1>`,
            );
            delete qrcodeData.qrcode_url;
            delete qrcodeData.code;
            return resolve(qrcodeData);
          }
          delete qrcodeData.code;
          return resolve(qrcodeData);
        })
        .catch((err) => {
          console.log(err);
          reject(new Error('Error updating secret. Please retry.'));
        });
    });
  }

  static async verify2FASecret(user, secrete) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id).then((_user) => {
        if (!_user) {
          reject(new Error('User not found.'));
          return;
        }
        if (!_user.tfa_secret) {
          reject(new Error('2AF Secret not set.'));
          return;
        }
        const verified = verify2faToken(user.tfa_secret, secrete);
        if (!verified) {
          reject(new Error('Invalid or wrong token.'));
          return;
        }
        resolve(verified);
      });
    });
  }

  static async enable2afCheck(user, token, tfaMethod) {
    const userCopy = { ...user };
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then((_user) => {
          if (!_user.tfa_secret) {
            reject(new Error('2FA Secret not set.'));
            return;
          }

          if (!verify2faToken(_user.tfa_secret, token)) {
            reject(new Error('Invalid or wrong token.'));
            return;
          }

          User.update(
            { is_tfa_enabled: true, tfa_method: tfaMethod, tfa_binded_date: new Date() },
            { where: { id: user.id } },
          )
            .then(async () => {
              userCopy.is_tfa_enabled = true;
              const uid = user.id;
              const oids = user?.AssociatedOrganisations.map(
                (assoc) => assoc.OrganisationId,
              );
              const jwtToken = jwt.sign(
                {
                  uid,
                  oids,
                },
                process.env.SECRET_KEY,
                {
                  expiresIn: '48hr',
                },
              );

              const currencyData = await CurrencyServices.getSpecificCurrencyExchangeRate(
                user.currency,
              );

              userCopy.dataValues.currencyData = currencyData;

              resolve({
                user,
                jwtToken,
              });
            })
            .catch((err) => {
              console.log(err);
              reject(new Error('Update failed. Please retry.'));
            });
        })
        .catch(() => {
          reject(new Error('User not found.'));
        });
    });
  }

  static async disable2afCheck(user) {
    const userCopy = { ...user };
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then((_user) => {
          if (!_user) {
            reject(new Error('User not found'));
            return;
          }

          User.update({ is_tfa_enabled: false }, { where: { id: user.id } })
            .then(() => {
              userCopy.is_tfa_enabled = false;
              resolve(user.toObject());
            })
            .catch((err) => {
              console.log(err);
              reject(new Error('Update failed. Please retry.'));
            });
        })
        .catch(() => {
          reject(new Error('User not found.'));
        });
    });
  }

  static async state2fa(user) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then((_user) => {
          if (!_user) {
            reject(new Error('User not found'));
            return;
          }
          resolve(_user.toObject());
        })
        .catch(() => {
          reject(new Error('User not found.'));
        });
    });
  }

  static async toggle2afCheck(user) {
    const userCopy = { ...user };
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then((_user) => {
          if (!_user) {
            reject(new Error('User not found'));
            return;
          }
          User.update(
            { is_tfa_enabled: !_user.is_tfa_enabled },
            { where: { id: user.id } },
          )
            .then(() => {
              userCopy.is_tfa_enabled = false;
              resolve(user.toObject());
            })
            .catch((err) => {
              console.log(err);
              reject(new Error('Update failed. Please retry.'));
            });
        })
        .catch(() => {
          reject(new Error('User not found.'));
        });
    });
  }

  static async createPasswordToken(UserId, requestIp, expiresAfter = 10) {
    const otp = GenerateVendorOtp();
    const token = createHash(otp);
    const expiresAt = moment().add(expiresAfter, 'm').toDate();
    const user = await UserService.findUser(UserId);
    const name = `${user.first_name} ${user.last_name}`;
    const create = await OneTimePassword.create({
      UserId,
      token,
      expires_at: expiresAt,
      request_ip: requestIp,
    });

    // await SmsService.sendOtp(
    //   user.phone,
    //   `Hi ${name}, your CHATS verification OTP is: ${otp} and ref is: ${create.ref}`
    // );

    await MailerService.sendVendorOTP(otp, create.ref, user.email, name);
    return create;
  }

  static async resendPasswordToken(UserId, passwordToken) {
    const user = await UserService.findUser(UserId);
    const name = `${user.first_name} ${user.last_name}`;
    const otp = GenerateVendorOtp();
    const token = createHash(otp);
    const expiresAt = moment().add(10, 'm').toDate();
    const updatedToken = await passwordToken.update({
      token,
      expires_at: expiresAt,
    });
    await SmsService.sendOtp(
      user.phone,
      `Hi ${name}, your CHATS verification OTP is: ${otp} and ref is: ${updatedToken.ref}`,
    );
    return updatedToken;
  }

  static async createResetPassword(UserId, requestIp, expiresAfter = 20) {
    const otp = GenerateOtp();
    const token = createHash(otp);
    const expiresAt = moment().add(expiresAfter, 'm').toDate();
    const user = await UserService.findUser(UserId);
    const name = user.first_name ? user.first_name : '';
    const reset = await OneTimePassword.create({
      UserId,
      token,
      expires_at: expiresAt,
      request_ip: requestIp,
    });
    await MailerService.sendOTP(otp, reset.ref, user.email, name);
    // await SmsService.sendOtp(
    //   user.phone,
    //   `Hi ${name}, your CHATS reset password OTP is: ${otp} and ref is: ${reset.ref}`
    // );
    return reset;
  }

  static async updatedPassord(user, rawPassword) {
    const password = createHash(rawPassword);
    return user.update({ password });
  }

  static getPasswordTokenRecord(ref) {
    return OneTimePassword.findOne({
      where: {
        ref,
        expires_at: {
          [Op.gte]: new Date(),
        },
      },
    });
  }

  static async inviteDonor(email, inviterId, CampaignId) {
    const token = jwt.sign(
      {
        email,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: '24hr',
      },
    );
    await Invites.create({
      id: uuidv4(), email, inviterId, token, CampaignId,
    });
    return token;
  }
}

module.exports = AuthService;
