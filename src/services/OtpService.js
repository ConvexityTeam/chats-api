const moment = require('moment');
const bcrypt = require('bcryptjs');
const { VerificationToken } = require('../models');
const { createHash } = require('../utils');

class OtpService {
  static async generateOtp(UserId, length, type) {
    return new Promise((resolve, reject) => {
      const expiresAt = moment().add(10, 'm').toDate();
      const token = createHash('123456');
      VerificationToken.findOne({ where: { UserId, type } })
        .then((existing) => {
          if (existing) {
            const updated = existing.update({
              expires_at: expiresAt,
              token,
            });

            resolve(updated.toObject());
            return;
          }
          const created = VerificationToken.create({
            UserId,
            type,
            token,
            expires_at: expiresAt,
          });

          resolve(created.toObject());
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static verifyOtp(UserId, type, token) {
    return new Promise((resolve, reject) => {
      VerificationToken.findOne({ where: { UserId, type } })
        .then((saved) => {
          if (saved && bcrypt.compareSync(token, saved.token)) {
            resolve(true);
          } else {
            reject(new Error('Invalid or wrong token.'));
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

module.exports = OtpService;
