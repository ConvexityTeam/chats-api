const axios = require('axios');
const dotenv = require('dotenv');
const { Response } = require('../libs');
const { HttpStatusCode } = require('../utils');

dotenv.config();
const Axios = axios.create();
const IsRecaptchaVerified = async (req, res, next) => {
  try {
    const { token } = req.body;
    const secreteKey = process.env.RECAPTCHA_SECRET_KEY;

    const { data } = await Axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secreteKey}&response=${token}`,
    );
    if (!data.success) {
      Response.setError(
        HttpStatusCode.STATUS_FORBIDDEN,
        'Error verifying recaptcha.',
      );
      return Response.send(res);
    }

    next();
  } catch (error) {
    Response.setError(
      HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
      'Server error. Please retry.',
    );
    return Response.send(res);
  }
  return null;
};

module.exports = {
  IsRecaptchaVerified,
};
