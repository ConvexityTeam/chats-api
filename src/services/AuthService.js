const {Op} = require('sequelize');
const {generate2faSecret, verify2faToken} = require('../utils');
const {User, PasswordResetToken, Invites} = require('../models');
const {v4: uuidv4} = require('uuid');
const {createHash, GenerateOtp} = require('../utils');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const OtpService = require('./OtpService');
const MailerService = require('./MailerService');
const UserService = require('./UserService');
const SmsService = require('./SmsService');

const {RateLimiterRedis} = require('rate-limiter-flexible');
const {RedisClient} = require('../services/RedisService');

const redisClient = redis.createClient(process.env.REDIS_URL, {
  enable_offline_queue: false
});
const maxWrongAttemptsByIPperDay = 100;
const maxConsecutiveFailsByEmailAndIP = 10;

// the rate limiter instance counts and limits the number of failed logins by key
const limiterSlowBruteByIP = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_fail_ip_per_day',
  // maximum number of failed logins allowed. 1 fail = 1 point
  // each failed login consumes a point
  points: maxWrongAttemptsByIPperDay,
  // delete key after 24 hours
  duration: 60 * 60 * 24,
  // number of seconds to block route if consumed points > points
  blockDuration: 60 * 60 * 24 // Block for 1 day, if 100 wrong attempts per day
});

const limiterConsecutiveFailsByEmailAndIP = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_fail_consecutive_email_and_ip',
  points: maxConsecutiveFailsByEmailAndIP,
  duration: 60 * 60, // Delete key after 1 hour
  blockDuration: 60 * 60 // Block for 1 hour
});
class AuthService {
  static async login(data, _password, roleId = null) {
    const error = new Error();
    return new Promise(async function (resolve, reject) {
      if (data) {
        const {password, tfa_secret, ...user} = data.toJSON();

        if (bcrypt.compareSync(_password, password)) {
          if (user.status == 'suspended') {
            error.status = 401;
            error.message = 'Account Suspended. Contact Support.';
            reject(error);
            return;
          }

          if (roleId && user.RoleId != roleId) {
            error.status = 401;
            error.message = 'Unathorized access.';
            reject(error);
            return;
          }
          const uid = user.id;
          const oids = user.AssociatedOrganisations.map(
            assoc => assoc.OrganisationId
          );
          const token = jwt.sign(
            {
              uid,
              oids
            },
            process.env.SECRET_KEY,
            {
              expiresIn: '48hr'
            }
          );
          resolve({
            user,
            token
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

  static async add2faSecret(user) {
    return new Promise(async (resolve, reject) => {
      let qrcodeData;

      if (!user.is_tfa_enabled) {
        generate2faSecret()
          .then(_data => {
            qrcodeData = _data;
            return User.update(
              {tfa_secret: _data.secret},
              {where: {id: user.id}}
            );
          })
          .then(() => {
            resolve(qrcodeData);
          })
          .catch(err => {
            console.log(err);
            reject(new Error(`Error updating secret. Please retry.`));
          });
        return;
      }

      reject(new Error(`2AF is already enanbled.`));
    });
  }

  static async enable2afCheck(user, token) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then(_user => {
          if (!_user.tfa_secret) {
            reject(new Error(`2FA Secret not set.`));
            return;
          }

          if (!verify2faToken(_user.tfa_secret, token)) {
            reject(new Error('Invalid or wrong token.'));
            return;
          }

          User.update({is_tfa_enabled: true}, {where: {id: user.id}})
            .then(() => {
              user.is_tfa_enabled = true;
              resolve(user.toObject());
            })
            .catch(err => {
              console.log(err);
              reject(new Error('Update failed. Please retry.'));
            });
        })
        .catch(() => {
          reject(new Error(`User not found.`));
        });
    });
  }

  static async disable2afCheck(user) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then(_user => {
          if (!_user) {
            reject(new Error(`User not found`));
            return;
          }

          User.update({is_tfa_enabled: false}, {where: {id: user.id}})
            .then(() => {
              user.is_tfa_enabled = false;
              resolve(user.toObject());
            })
            .catch(err => {
              console.log(err);
              reject(new Error('Update failed. Please retry.'));
            });
        })
        .catch(() => {
          reject(new Error(`User not found.`));
        });
    });
  }

  static async state2fa(user) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then(_user => {
          if (!_user) {
            reject(new Error(`User not found`));
            return;
          }
          resolve(_user.toObject());
        })
        .catch(() => {
          reject(new Error(`User not found.`));
        });
    });
  }

  static async toggle2afCheck(user) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then(_user => {
          if (!_user) {
            reject(new Error(`User not found`));
            return;
          }
          User.update(
            {is_tfa_enabled: !_user.is_tfa_enabled},
            {where: {id: user.id}}
          )
            .then(() => {
              user.is_tfa_enabled = false;
              resolve(user.toObject());
            })
            .catch(err => {
              console.log(err);
              reject(new Error('Update failed. Please retry.'));
            });
        })
        .catch(() => {
          reject(new Error(`User not found.`));
        });
    });
  }

  static async createResetPassword(UserId, request_ip, expiresAfter = 20) {
    const otp = GenerateOtp();
    const token = createHash(otp);
    const expires_at = moment().add(expiresAfter, 'm').toDate();
    const user = await UserService.findUser(UserId);
    const name = user.first_name ? user.first_name : '';
    const reset = await PasswordResetToken.create({
      UserId,
      token,
      expires_at,
      request_ip
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
    return user.update({password});
  }

  static getPasswordTokenRecord(ref) {
    return PasswordResetToken.findOne({
      where: {
        ref,
        expires_at: {
          [Op.gte]: new Date()
        }
      }
    });
  }
  static async inviteDonor(email, inviterId, CampaignId) {
    const token = jwt.sign(
      {
        email
      },
      process.env.SECRET_KEY,
      {
        expiresIn: '24hr'
      }
    );
    await Invites.create({id: uuidv4(), email, inviterId, token, CampaignId});
    return token;
  }
}

module.exports = AuthService;
