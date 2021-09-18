const {
  body
} = require('express-validator');
const {
  HttpStatusCode
} = require('../utils');
const formidable = require("formidable");
const Validator = require("validatorjs");
const {Response} = require('../libs');
const BaseValidator = require('./BaseValidator');

class BeneficiaryValidator extends BaseValidator {
  static selfRegisterRules() {
    return [
      body('first_name')
      .notEmpty()
      .withMessage('First name is required.'),
      body('last_name')
      .notEmpty()
      .withMessage('Last name is required.'),
      body('email')
      .isEmail()
      .withMessage('Email is not a valid email address.'),
      body('phone')
      .isMobilePhone()
      .withMessage('Phone number is not a vlaid phone number.'),
      body('gender')
      .isIn(['male', 'female'])
      .withMessage('Gender must be any of [male, female]'),
      body('address')
      .notEmpty()
      .withMessage('Address is required'),
      body('password')
      .notEmpty()
      .withMessage('Password is required.'),
      body('dob')
      .isDate({
        format: 'DD-MM-YYYY',
        strictMode: true
      })
      .withMessage('Date of birth must be a valid date.')
      .isAfter()
      .withMessage('Date of birth must be before today.')
    ]
  }

  static async validateSelfRegister(req, res, next) {
    const form = new formidable.IncomingForm({
      multiples: true
    });

    form.parse(req, (err, fields, files) => {
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        email: "required|email",
        phone: "required|numeric",
        gender: "required|in:male,female",
        address: "string",
        password: "required",
        dob: "date|before:today",
      };

      const allowedFileTypes = ["image/jpeg", "image/png", "image/jpg"];

      fields["today"] = new Date(Date.now()).toDateString();

      const validation = new Validator(fields, rules);

      if (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Form parsing failed. Please try again.');
        Response.send(res);
        return;
      }

      if (validation.fails()) {
        Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', validation.errors.errors);
        return Response.send(res);
      }

      if (!files.profile_pic) {
        Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', {
            profile_pic: ["Profile Pic Required"]
          ,
        });
        return Response.send(res);
      }

      if (!allowedFileTypes.includes(files.profile_pic.type)) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', {
              profile_pic: ["Invalid File type. Only jpg, png and jpeg files allowed for Profile picture"]
            },
          
        );
        return Response.send(res);
      }

      req.files = files;
      req.body = {...req.body, ...fields}
      next();
    });
  }
}

module.exports = BeneficiaryValidator;