
const { Op } = require('sequelize');
const { generate2faSecret, verify2faToken } = require('../utils');
const { User, PasswordResetToken } = require('../models');
const { createHash } = require('../utils');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const jwt = require("jsonwebtoken");

class AuthService {
  static async login(data, _password, roleId = null) {
    const error = new Error();
    return new Promise(function (resolve, reject) {
      if (data) {
        const {
          password,
          tfa_secret,
          ...user
        } = data.toJSON();
        if (bcrypt.compareSync(_password, password)) {
          if (user.status == "suspended") {
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
          const oids = user.AssociatedOrganisations.map(assoc => assoc.OrganisationId);
          const token = jwt.sign({
            uid,
            oids
          }, process.env.SECRET_KEY, {
            expiresIn: "48hr",
          });
          resolve({
            user,
            token
          })
        }

        error.status = 401;
        error.message = 'Invalid login credentials';
        reject(error);
      } else {
        error.status = 401;
        error.message = 'Invalid login credentials';
        reject(error);
      }
    })
  }

  static async add2faSecret(user) {
    return new Promise(async (resolve, reject) => {
      let qrcodeData;

      if (!user.is_tfa_enabled) {
        generate2faSecret()
          .then(_data => {
            qrcodeData = _data;
            return User.update({ tfa_secret: _data.secret }, { where: { id: user.id }})
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

      reject(new Error(`2AF is already enanbled.`))
    })
  }

  static async enable2afCheck(user, token) {
    return new Promise((resolve, reject) => {
      User.findByPk(user.id)
        .then((_user) => {
          if (!_user.tfa_secret) {
            reject(new Error(`2FA Secret not set.`))
            return;
          }

          if (!verify2faToken(_user.tfa_secret, token)) {
            reject(new Error('Invalid or wrong token.'));
            return;
          }

          User.update({ is_tfa_enabled: true }, { where: { id: user.id }})
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
    })
  }

  static async createResetPassword(UserId, request_ip, expiresAfter = 20) {
    const token = createHash('123456');
    const expires_at = moment().add(expiresAfter, 'm').toDate();

    return PasswordResetToken.create({UserId, token, expires_at, request_ip});
  }

  static async updatedPassord(user, rawPassword) {
    const password = createHash(rawPassword);
    return user.update({ password });
  }

  static getPasswordTokenRecord(ref) {
    return PasswordResetToken.findOne({where: {
      ref,
      expires_at: {
        [Op.gte]: new Date()
      }
    }});
  }
}

module.exports = AuthService;