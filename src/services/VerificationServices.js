const jwt = require('jsonwebtoken');
const { email } = require('../config/switchwallet');
const { HttpStatusCode } = require('../utils');
const db = require('../models');
const { data } = require('../libs/Response');

/**
 * Verification Service is for generating and verifying users contact details(email, phone, etc)
*/

class VerificationServices {
  /**
   *
   * @param {usersEmail} usersEmail users email to be verify
   */
  static async verifyEmail() {
    this.generateToken(email);
  }

  static async verifyUser(usersToken) {
    this.verifyToken(usersToken);
  }

  static generateToken() {
    return jwt.sign(
      { email: data.email },
      process.env.SECRET_KEY,
      { expiresIn: '24hr' },
    );
  }

  static verifyToken(req, res) {
    // verify token
    jwt.verify(
      // confirmationCode,
      process.env.SECRET_KEY,
      async (err, payload) => {
        if (err) {
          // if token was tampered with or invalid
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Email verification failed Possibly the link is invalid or Expired',
          );
          return Response.send(res);
        }
        // fetch users records from the database
        const userExist = await db.User.findOne({
          where: { email: payload.email },
        });

        if (!userExist) {
          // if users email doesnt exist then
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Email verification failed, Account Not Found',
          );

          return Response.send(res);
        }
        // update users status to verified
        db.User.update(
          { status: 'activated', is_email_verified: true },
          { where: { email: payload.email } },
        )
          .then(() => {
            Response.setSuccess(
              200,
              `User With Email: ${payload.email} Account Activated!`,
            );
            return Response.send(res);
          })
          .catch(() => {
            throw new Error('Users Account Activation Failed!. Please retry.');
          });
        return null;
      },
    );
  }
}

module.exports = VerificationServices;
