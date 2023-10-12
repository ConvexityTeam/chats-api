const fs = require('fs');
const { Op } = require('sequelize');
const formidable = require('formidable');
const bcrypt = require('bcryptjs');
const Validator = require('validatorjs');
const sequelize = require('sequelize');
const { Message } = require('@droidsolutions-oss/amqp-ts');
const {
  compareHash,
  createHash,
  SanitizeObject,
  HttpStatusCode,
  AclRoles,
  generateRandom,
  GenearteVendorId,
  GenerateUserId,
} = require('../utils');
const db = require('../models');
const uploadFile = require('./AmazonController');
const {
  BeneficiaryService,
  UserService,
  PaystackService,
  QueueService,
  WalletService,
  SmsService,
  MailerService,
  CampaignService,
  CurrencyServices,
} = require('../services');
const { Response, Logger } = require('../libs');

const amqp1 = require('../libs/RabbitMQ/Connection');
const codeGenerator = require('./QrCodeController');
const AwsUploadService = require('../services/AwsUploadService');

const transferToQueue = amqp1.default.declareQueue('transferTo', {
  durable: true,
});

const transferFromQueue = amqp1.default.declareQueue('transferFrom', {
  durable: true,
});

const environ = process.env.NODE_ENV === 'development' ? 'd' : 'p';

function getDifference(dob) {
  const today = new Date();
  // const past = new Date(dob); // remember this is equivalent to 06 01 2010
  // dates in js are counted from 0, so 05 is june
  const diff = Math.floor(today.getTime() - dob.getTime());
  const day = 1000 * 60 * 60 * 24;

  const days = Math.floor(diff / day);
  const months = Math.floor(days / 31);
  const years = Math.floor(months / 12);

  return years;
}

class UsersController {
  static async getAllUsers(res) {
    try {
      const allUsers = await UserService.getAllUsers();
      if (allUsers.length > 0) {
        Response.setSuccess(200, 'Users retrieved', allUsers);
      } else {
        Response.setSuccess(200, 'No User found');
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async addUser(req, res) {
    if (!req.body.first_name || !req.body.last_name || !req.body.email) {
      Response.setError(400, 'Please provide complete details');
      return Response.send(res);
    }
    try {
      const newUser = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
      };
      const createdUser = await UserService.addUser(newUser);
      Response.setSuccess(201, 'User Added!', createdUser);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, error.message);
      return Response.send(res);
    }
  }

  static async createVendor(req, res) {
    const {
      first_name: firstName, last_name: lastName,
      email, phone, address, location, store_name: storeName,
    } = req.body;

    try {
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'required|email',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        store_name: 'required|string',
        address: 'required|string',
        location: 'required|string',
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const user = await UserService.findByEmail(email);
      if (user) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken',
        );
        return Response.send(res);
      }
      const rawPassword = generateRandom(8);
      const password = createHash(rawPassword);
      const vendorId = GenearteVendorId();
      const createdVendor = await UserService.createUser({
        RoleId: AclRoles.Vendor,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
      });
      await QueueService.createWallet(createdVendor.id, 'user');
      const store = await db.Market.create({
        store_name: storeName,
        address,
        location,
        UserId: createdVendor.id,
      });

      await MailerService.verify(
        email,
        `${firstName} ${lastName}`,
        vendorId,
        rawPassword,
      );
      await QueueService.createWallet(createdVendor.id, 'user');

      await SmsService.sendOtp(
        phone,
        `Hi, ${firstName}  ${lastName} your CHATS account ID is: ${vendorId} , password is: ${rawPassword}`,
      );
      createdVendor.dataValues.password = null;
      createdVendor.dataValues.store = store;
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor Account Created.',
        createdVendor,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error. Contact Support${error}`,
      );
      return Response.send(res);
    }
  }

  static async groupAccount(req, res) {
    const {
      group, representative, member, campaignId,
    } = req.body;

    try {
      const rules = {
        campaignId: 'required|integer',
        'representative.first_name': 'required|alpha',
        'representative.last_name': 'required|alpha',
        'representative.gender': 'required|in:male,female',
        'representative.email': 'required|email',
        'representative.phone': [
          'required',
          'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/',
        ],
        'representative.address': 'string',
        'representative.location': 'string',
        'representative.password': 'required',
        'representative.dob': 'required|date',
        'representative.nfc': 'string',
        'member.*.full_name': 'required|string',
        'member.*.dob': 'required|date',
        'group.group_name': 'required|string',
        'group.group_category': 'required|string',
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const data = member;
      const find = await UserService.findByEmail(representative.email);
      if (find) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken',
        );
        return Response.send(res);
      }
      const result = await db.sequelize.transaction(async (t) => {
        const campaignExist = await CampaignService.getCampaignById(campaignId);
        if (!campaignExist) {
          Response.setError(404, 'Campaign not found');
          return Response.send(res);
        }
        representative.RoleId = AclRoles.Beneficiary;
        representative.password = createHash('0000');
        representative.pin = createHash('0000');
        const parent = await db.User.create(representative, { transaction: t });
        await db.Beneficiary.create(
          {
            UserId: parent.id,
            CampaignId: campaignExist.id,
            approved: true,
            source: 'field app',
          },
          { transaction: t },
        );

        await QueueService.createWallet(parent.id, 'user', campaignId);
        group.representative_id = parent.id;
        const grouping = await db.Group.create(group, { transaction: t });

        const memPromises = data.map(async (originalMem) => {
          const mem = { ...originalMem };
          mem.group_id = grouping.id;
          return mem;
        });
        const members = await Promise.all(memPromises);
        parent.dataValues.group = grouping;
        parent.dataValues.members = members;
        return parent;
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Group Created',
        result,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error. Contact Support${error}`,
      );
      return Response.send(res);
    }
  }

  static async FieldUploadImage(req, res) {
    try {
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) {
          Response.setError(
            HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
            'Internal Server Error. Contact Support',
          );
          return Response.send(res);
        }
        if (!files.profile_pic) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Please provide a profile picture',
          );
          return Response.send(res);
        }
        const extension = files.profile_pic.name.substring(
          files.profile_pic.name.lastIndexOf('.') + 1,
        );
        const profilePic = await uploadFile(
          files.profile_pic,
          `u-${environ}-${GenerateUserId()}-i.${extension}`,
          'convexity-profile-images',
        );
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Profile picture uploaded',
          profilePic,
        );
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error. Contact Support${error}`,
      );
      return Response.send(res);
    }
    return null;
  }

  static async verifyNin(req, res) {
    const data = req.body;
    try {
      const rules = {
        vnin: 'required|size:16',
        country: 'string',
        user_id: 'required|numeric',
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const user = await UserService.getAUser(data.user_id);
      if (!user) {
        Response.setError(404, 'User not found');
        return Response.send(res);
      }
      let hash;
      if (data.vnin && process.env.ENVIRONMENT !== 'staging') {
        hash = createHash(data.vnin);

        const nin = await UserService.nin_verification(
          { number: data.vnin },
          data.country || 'Nigeria',
        );
        if (!nin.status) {
          Response.setError(
            HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
            'Not a Valid NIN',
          );
          return Response.send(res);
        }
        data.is_verified = true;
        data.is_nin_verified = true;
        data.nin = hash;
        await user.update(data);
      }
      data.is_verified = true;
      data.is_nin_verified = true;
      data.nin = hash;
      await user.update(data);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'NIN Verified');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal error occured. Please try again.${error}`,
      );
      return Response.send(res);
    }
  }

  static async addBankAccount(req, res) {
    try {
      const data = SanitizeObject(req.body, ['account_number', 'bank_code']);
      try {
        const resolved = await PaystackService.resolveAccount(
          data.account_number,
          data.bank_code,
        );
        data.account_name = resolved.account_name;
      } catch (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, err.message);
        return Response.send(res);
      }

      try {
        const recipient = await PaystackService.createRecipientReference(
          data.account_name,
          data.account_number,
          data.bank_code,
        );
        data.bank_name = recipient.details.bank_name;
        data.recipient_code = recipient.recipient_code;
        data.type = recipient.type;
      } catch (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, err.message);
        return Response.send(res);
      }

      const account = await UserService.addUserAccount(req.user.id, data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Bank Account Added',
        account,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async getUserAccouns(req, res) {
    try {
      const accounts = await UserService.findUserAccounts(req.user.id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Bank Accounts', accounts);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async liveness(req, res) {
    try {
      const rules = {
        first_name: 'required|alpha',
        surname: 'alpha',
        phone: ['regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        nin_photo_url: 'required|string',
        email: 'email',
        dob: 'date',
      };
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        const validation = new Validator(fields, rules);
        if (validation.fails()) {
          Response.setError(422, Object.values(validation.errors.errors)[0][0]);
          return Response.send(res);
        }

        const user = await UserService.findSingleUser({ id: req.user.id });
        if (!user) {
          Response.setError(404, 'User not found');
          return Response.send(res);
        }
        if (!files.liveness_capture) {
          Response.setError(422, 'Liveness Capture Required');
          return Response.send(res);
        }
        const outputFilePath = 'image.png';
        const base64Image = fields.nin_photo_url.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const imageBuffer = Buffer.from(base64Image, 'base64');

        fs.writeFileSync(outputFilePath, imageBuffer);
        const fileContent = fs.readFileSync(outputFilePath);
        const extension = files.liveness_capture.name.substring(
          files.liveness_capture.name.lastIndexOf('.') + 1,
        );
        const [ninPhotoUrl, livenessCapture] = await Promise.all([
          uploadFile(
            fileContent,
            `u-${environ}-${req.user.id}-i.${new Date()}`,
            'convexity-profile-images',
          ),
          uploadFile(
            files.liveness_capture,
            `u-${
              environ
            }-${
              req.user.id
            }-i.${
              extension
            }-${
              new Date()}`,
            'convexity-profile-images',
          ),
        ]);

        await fs.promises.unlink(outputFilePath);

        const existLiveness = await UserService.findLiveness(req.user.id);
        if (existLiveness) {
          existLiveness.update(fields);
          Response.setSuccess(
            HttpStatusCode.STATUS_OK,
            'Liveness Updated',
            existLiveness,
          );
          return Response.send(res);
        }
        const validatedFields = { ...fields };
        validatedFields.liveness_capture = livenessCapture;
        validatedFields.nin_photo_url = ninPhotoUrl;
        validatedFields.authorized_by = req.user.id;

        const liveness = await UserService.createLiveness(validatedFields);
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Liveness',
          liveness,
        );
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
    return null;
  }

  static async updateProfile(req, res) {
    try {
      const data = req.body;
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        phone: ['regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        username: 'string',
        nin: 'size:16',
      };
      Logger.info(`Request Body: ${JSON.stringify(data)}`);
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Logger.error(`Validation Error: ${JSON.stringify(validation.errors)}`);
        Response.setError(422, validation.errors);
        return Response.send(res);
      }

      if (data.username) {
        const user = await UserService.findSingleUser({
          username: data.username,
        });
        const me = await UserService.findSingleUser({
          username: data.username,
          id: req.user.id,
        });
        if (!me && user) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Username already taken',
          );
          return Response.send(res);
        }
      }

      const currencyData = await CurrencyServices.getSpecificCurrencyExchangeRate(data.currency);

      if (data.nin && process.env.ENVIRONMENT !== 'staging') {
        const hash = createHash(data.nin);
        const isExist = await UserService.findSingleUser({ nin: data.nin });
        if (isExist) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            `user with this nin: ${data.nin} exist`,
          );
          return Response.send(res);
        }
        if (!data.country) {
          const nin = await UserService.nin_verification(
            { number: data.nin },
            JSON.parse(req.user.location).country,
          );
          if (!nin.status) {
            Response.setError(
              HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
              'Not a Valid NIN',
            );
            return Response.send(res);
          }
        }
        data.is_verified = true;
        data.is_nin_verified = true;
        data.nin = hash;
        await req.user.update(data);

        const userObject = req.user.toObject();

        if (req.user.RoleId === AclRoles.NgoAdmin) {
          userObject.currencyData = currencyData;
        }
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Profile Updated',
          req.user.toObject(),
        );
        return Response.send(res);
      }
      data.is_nin_verified = true;
      data.is_verified = true;
      await req.user.update(data);
      const userObject = req.user.toObject();

      if (req.user.RoleId === AclRoles.NgoAdmin) {
        userObject.currencyData = currencyData;
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Profile Updated',
        userObject,
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(`Server Error. Please retry: ${JSON.stringify(error)}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server Error. Please retry.${error}`,
      );
      return Response.send(res);
    }
  }

  static async findProfile(req, res) {
    try {
      const profile = (await UserService.findUser(req.user.id)).toObject();
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'User profile', profile);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async updatedUser(req, res) {
    try {
      const data = req.body;
      data.today = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        phone: 'required|string',
        address: 'required|string',
        location: 'required|string',
        marital_status: 'required|alpha|in:single,married',
        dob: 'date|before:today',
        bvn: 'numeric',
        nin: 'numeric',
        id: 'required|numeric',
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      const filterData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
        location: data.location,
        marital_status: data.marital_status,
        dob: data.dob,
        bvn: data.bvn,
        nin: data.nin,
      };

      try {
        const updateData = {};
        Object.keys(filterData).forEach((key) => {
          if (data[key]) {
            updateData[key] = data[key];
          }
        });
        const user = await db.User.findByPk(data.id);
        if (!user) {
          Response.setError(404, 'Invalid User Id');
          return Response.send(res);
        }
        await user.update(updateData);
        Response.setSuccess(200, 'User Updated Successfully');
        return Response.send(res);
      } catch (error) {
        Response.setError(422, error.message);
        return Response.send(res);
      }
    } catch (error) {
      console.log('youandme');
    }
    return null;
  }

  static async updateProfileImage(req, res) {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      const rules = {
        userId: 'required|numeric',
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      if (!files.profile_pic) {
        Response.setError(422, 'Profile Image Required');
        return Response.send(res);
      }
      const user = await db.User.findByPk(fields.userId);
      if (user) {
        const extension = files.profile_pic.name.substring(
          files.profile_pic.name.lastIndexOf('.') + 1,
        );
        await uploadFile(
          files.profile_pic,
          `u-${environ}-${user.id}-i.${extension}`,
          'convexity-profile-images',
        ).then((url) => {
          user.update({
            profile_pic: url,
          });
        });
        Response.setSuccess(200, 'Profile Picture Updated');
        return Response.send(res);
      }
      Response.setError(422, 'Invalid User');
      return Response.send(res);
    });
  }

  static async updateNFC(req, res) {
    try {
      const data = req.body;
      const rules = {
        nfc: 'required|string',
        id: 'required|numeric',
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      await db.User.update(data, {
        where: {
          id: data.id,
        },
      }).then(() => {
        Response.setSuccess(200, 'User NFC Data Updated Successfully');
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(422, error.message);
      return Response.send(res);
    }
    return null;
  }

  static async getAUser(req, res) {
    const { id } = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Please input a valid numeric value');
      return Response.send(res);
    }

    try {
      const theUser = await UserService.getAUser(id);
      if (!theUser) {
        Response.setError(404, `Cannot find User with the id ${id}`);
      } else {
        Response.setSuccess(200, 'Found User', theUser);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(404, error.toString());
      return Response.send(res);
    }
  }

  static async resetPassword(req, res) {
    const { email } = req.body;
    try {
      // check if users exist in the db with email address
      db.User.findOne({
        where: {
          email,
        },
      })
        .then((user) => {
          // reset users email password
          if (user !== null) {
            // if there is a user
            // generate new password
            const newPassword = Response.generatePassword();
            // update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then((hash) => {
                const encryptedPassword = hash;
                return db.User.update(
                  {
                    password: encryptedPassword,
                  },
                  {
                    where: {
                      email,
                    },
                  },
                ).then(() => {
                  // mail user a new password
                  // respond with a success message
                  res.status(201).json({
                    status: 'success',
                    message:
                      'An email has been sent to the provided email address, kindly login to your email address to continue',
                  });
                });
              });
            });
          }
        })
        .catch((err) => {
          res.status(404).json({
            status: 'error',
            error: err,
          });
        });
    } catch (error) {
      Response.setError(500, `Internal Server Error ${error.toString}`);
      return Response.send(res);
    }
    return null;
  }

  static async deactivate(req, res) {
    try {
      const id = req.body.userId;

      const user = await db.User.findByPk(id);

      user.status = 'suspended';
      user.save();

      Response.setSuccess(200, 'User Deactivated successfully');
      return Response.send(res);
    } catch (error) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
  }

  static async updatePassword(req, res) {
    const { oldPassword, newPassword, confirmedPassword } = req.body;
    if (newPassword !== confirmedPassword) {
      Response.setError(400, 'New password does not match confirmed password ');
      return Response.send(res);
    }
    const userId = req.user.id;
    db.User.findOne({
      where: {
        id: userId,
      },
    })
      .then((user) => {
        bcrypt
          .compare(oldPassword, user.password)
          .then((valid) => {
            if (!valid) {
              Response.setError(419, 'Old Password does not match');
              return Response.send(res);
            }
            // update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then(async (hash) => {
                const encryptedPassword = hash;
                await user
                  .update({
                    password: encryptedPassword,
                  })
                  .then(() => {
                    // mail user a new password
                    // //respond with a success message
                    // res.status(201).json({
                    //   status: "success",
                    //   message:
                    //     "An email has been sent to the provided email address,
                    //  kindly login to your email address to continue",
                    // });
                    Response.setError(200, 'Password changed successfully');
                    return Response.send(res);
                  });
              });
            });
            return null;
          })
          .catch(() => {
            Response.setError(419, 'Internal Server Error. Please try again.');
            return Response.send(res);
          });
      })
      .catch(() => {
        Response.setError(419, 'Internal Server Error. Please try again.');
        return Response.send(res);
      });
    return null;
  }

  static async deleteUser(req, res) {
    const { id } = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Please provide a numeric value');
      return Response.send(res);
    }

    try {
      const UserToDelete = await UserService.deleteUser(id);

      if (UserToDelete) {
        Response.setSuccess(200, 'User deleted');
      } else {
        Response.setError(404, `User with the id ${id} cannot be found`);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getBeneficiaryTransactions(req, res) {
    const { beneficiary } = req.params;
    const beneficiaryExist = await BeneficiaryService.getUser(beneficiary);
    if (beneficiaryExist) {
      const wallet = await beneficiaryExist.getWallet();
      const wallets = wallet.map((element) => element.uuid);
      await db.Transaction.findAll({
        where: {
          [Op.or]: {
            walletRecieverId: {
              [Op.in]: wallets,
            },
            walletSenderId: {
              [Op.in]: wallets,
            },
          },
        },
      }).then((response) => {
        Response.setSuccess(200, 'Transactions Retrieved', response);
        return Response.send(res);
      });
    } else {
      Response.setError(422, 'Beneficiary Id is Invalid');
      return Response.send(res);
    }
    return null;
  }

  static async getRecentTransactions(req, res) {
    const { beneficiary } = req.params;
    const beneficiaryExist = await BeneficiaryService.getUser(beneficiary);
    if (beneficiaryExist) {
      const wallet = await beneficiaryExist.getWallet();
      const wallets = wallet.map((element) => element.uuid);

      await db.Transaction.findAll({
        where: {
          [Op.or]: {
            walletRecieverId: {
              [Op.in]: wallets,
            },
            walletSenderId: {
              [Op.in]: wallets,
            },
          },
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }).then((response) => {
        Response.setSuccess(200, 'Transactions Retrieved', response);
        return Response.send(res);
      });
    } else {
      Response.setError(422, 'Beneficiary Id is Invalid');
      return Response.send(res);
    }
    return null;
  }

  static async getTransaction(req, res) {
    const { uuid } = req.params;
    const transactionExist = await db.Transaction.findOne({
      where: {
        uuid,
      },
      include: ['SenderWallet', 'RecievingWallet'],
    });
    if (transactionExist) {
      Response.setSuccess(200, 'Transaction Retrieved', transactionExist);
      return Response.send(res);
    }
    Response.setError(422, 'Transaction Id is Invalid');
    return Response.send(res);
  }

  static async getStats(req, res) {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const wallet = await db.User.findOne({
      where: {
        id: req.user.id,
      },
      include: ['Wallet'],
    });
    const wallets = wallet.Wallet.map((element) => element.uuid);

    const income = await db.Transaction.findAll({
      where: {
        walletRecieverId: {
          [Op.in]: wallets,
        },
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay,
        },
      },
      attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'income']],
      raw: true,
    });
    const expense = await db.Transaction.findAll({
      where: {
        walletSenderId: {
          [Op.in]: wallets,
        },
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay,
        },
      },
      attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'expense']],
      raw: true,
    });
    Response.setSuccess(200, 'Statistics Retrieved', [
      {
        balance: wallet.Wallet.balance,
        income: income[0].income == null ? 0 : income[0].income,
        expense: expense[0].expense == null ? 0 : expense[0].expense,
      },
    ]);
    return Response.send(res);
  }

  static async getChartData(res) {
    const users = await db.User.findAll({
      where: {
        RoleId: 5,
        dob: {
          [Op.ne]: null,
        },
      },
    });
    const genderChart = {
      male: 0,
      female: 0,
    };
    const ageGroups = {
      '18-29': 0,
      '30-41': 0,
      '42-53': 0,
      '54-65': 0,
      '65~': 0,
    };

    users.forEach((user) => {
      if (user.gender === 'male') {
        genderChart.male += 1;
      } else if (user.gender === 'female') {
        genderChart.female += 1;
      }

      const diff = getDifference(user.dob);
      if (diff >= 18 && diff <= 29) {
        ageGroups['18-29'] += 1;
      } else if (diff >= 30 && diff <= 41) {
        ageGroups['30-41'] += 1;
      } else if (diff >= 42 && diff <= 53) {
        ageGroups['42-53'] += 1;
      } else if (diff >= 54 && diff <= 65) {
        ageGroups['54-65'] += 1;
      } else if (diff > 65) {
        ageGroups['65~'] += 1;
      }
    });

    Response.setSuccess(200, 'Chart Data Retrieved', {
      gender_chart: genderChart,
      age_chart: ageGroups,
    });
    return Response.send(res);
  }

  static async countUserTypes(res) {
    const vendors = await db.User.count({
      where: {
        RoleId: 4,
      },
    });
    const beneficiaries = await db.User.count({
      where: {
        RoleId: 5,
      },
    });
    Response.setSuccess(200, 'Users Type Counted', {
      vendors,
      beneficiaries,
    });
    return Response.send(res);
  }

  static async getTotalAmountRecieved(req, res) {
    await db.User.findOne({
      where: {
        id: req.params.id,
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
      },
    }).then(async (user) => {
      await db.Transaction.findAll({
        where: {
          walletRecieverId: user.Wallet.uuid,
        },
        attributes: [
          [sequelize.fn('sum', sequelize.col('amount')), 'amount_recieved'],
        ],
      }).then(async (transactions) => {
        Response.setSuccess(200, 'Recieved Transactions', {
          transactions,
        });
        return Response.send(res);
      });
    });
  }

  static async getWalletBalance(req, res) {
    const userId = req.params.id;
    await db.User.findOne({
      where: {
        id: userId,
      },
      include: ['Wallet'],
    })
      .then((user) => {
        Response.setSuccess(200, 'User Wallet Balance', user.Wallet);
        return Response.send(res);
      })
      .catch(() => {
        Response.setError(404, 'Invalid User Id');
        return Response.send(res);
      });
  }

  static async addToCart(req, res) {
    const data = req.body;
    const rules = {
      userId: 'required|numeric',
      productId: 'required|numeric',
      quantity: 'required|numeric',
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    }
    const user = await db.User.findByPk(data.userId);
    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
    const product = await db.Products.findOne({
      where: {
        id: data.productId,
      },
      include: {
        model: db.Market,
        as: 'Vendor',
      },
    });
    if (!product) {
      Response.setError(404, 'Invalid Product');
      return Response.send(res);
    }
    const pendingOrder = await db.Order.findOne({
      where: {
        UserId: data.userId,
        status: 'pending',
      },
      include: {
        model: db.OrderProducts,
        as: 'Cart',
        order: [['createdAt', 'DESC']],
        include: {
          model: db.Products,
          as: 'Product',
        },
      },
    });

    if (!pendingOrder) {
      const uniqueId = String(
        Math.random().toString(36).substring(2, 12),
      ).toUpperCase();
      await user
        .createOrder({
          OrderUniqueId: uniqueId,
        })
        .then(async (order) => {
          await order
            .createCart({
              ProductId: product.id,
              unit_price: product.price,
              quantity: data.quantity,
              total_amount: product.price * data.quantity,
            })
            .then(() => {
              Response.setSuccess(
                201,
                `${product.name} has been added to cart`,
              );
              return Response.send(res);
            });
        });
    } else if (pendingOrder.Cart.length) {
      if (pendingOrder.Cart[0].Product.MarketId !== product.MarketId) {
        Response.setError(
          400,
          'Cannot add product that belongs to a different vendor',
        );
        return Response.send(res);
      }
      const productAddedToCart = await db.OrderProducts.findOne({
        where: {
          ProductId: product.id,
        },
      });
      if (productAddedToCart) {
        await productAddedToCart
          .update({
            quantity: data.quantity,
            total_amount: data.quantity * product.price,
            unit_price: product.price,
          })
          .then(() => {
            Response.setSuccess(
              201,
              `${product.name} has been added to cart`,
            );
            return Response.send(res);
          });
      } else {
        await pendingOrder
          .createCart({
            ProductId: product.id,
            quantity: data.quantity,
            total_amount: data.quantity * product.price,
            unit_price: product.price,
          })
          .then(() => {
            Response.setSuccess(
              201,
              `${product.name} has been added to cart`,
            );
            return Response.send(res);
          });
      }
    } else {
      await pendingOrder
        .createCart({
          ProductId: product.id,
          quantity: data.quantity,
          total_amount: data.quantity * product.price,
          unit_price: product.price,
        })
        .then(() => {
          Response.setSuccess(
            201,
            `${product.name} has been added to cart`,
          );
          return Response.send(res);
        });
    }
    return null;
  }

  static async getCart(req, res) {
    const id = req.params.userId;
    const user = await db.User.findByPk(id);
    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
    const pendingOrder = await db.Order.findOne({
      where: {
        UserId: id,
        status: 'pending',
      },
      include: {
        model: db.OrderProducts,
        as: 'Cart',
        attributes: {
          exclude: ['OrderId'],
        },
      },
    });

    if (pendingOrder && pendingOrder.Cart.length) {
      Response.setSuccess(200, 'Cart', {
        cart: pendingOrder.Cart,
      });
      return Response.send(res);
    }
    Response.setError(400, 'No Item in Cart');
    return Response.send(res);
  }

  static async updatePin(req, res) {
    const data = req.body;
    const rules = {
      userId: 'required|numeric',
      pin: 'required|numeric',
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const user = await db.User.findByPk(data.userId);
    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
    await user
      .update({
        pin: data.pin,
      })
      .then(() => {
        Response.setSuccess(200, 'Pin updated Successfully');
        return Response.send(res);
      });
    return null;
  }

  static async getSummary(req, res) {
    const user = await db.User.findOne({
      where: {
        id: req.params.id,
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
      },
    });

    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }

    const wallets = user.Wallet.map((element) => element.uuid);

    const spent = await db.Transaction.sum('amount', {
      where: {
        walletSenderId: {
          [Op.in]: wallets,
        },
      },
    });
    const recieved = await db.Transaction.sum('amount', {
      where: {
        walletRecieverId: {
          [Op.in]: wallets,
        },
      },
    });
    Response.setSuccess(200, 'Summary', {
      balance: user.Wallet.balance,
      recieved,
      spent,
    });
    return Response.send(res);
  }

  static async fetchPendingOrder(req, res) {
    const { userId } = req.params;
    const userExist = await db.User.findByPk(userId);

    if (userExist) {
      const pendingOrder = await db.Order.findOne({
        where: {
          UserId: userId,
          status: 'pending',
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          attributes: {
            exclude: ['OrderId'],
          },
          include: {
            model: db.Products,
            as: 'Product',
            include: {
              model: db.Market,
              as: 'Vendor',
            },
          },
        },
      });

      if (pendingOrder) {
        const image = await codeGenerator(pendingOrder.id);
        const result = {
          orderUniqueId: pendingOrder.OrderUniqueId,
          image,
          status: pendingOrder.status,
        };
        if (pendingOrder.Cart) {
          const cart = pendingOrder.Cart.map((mappedCart) => ({
            quantity: mappedCart.quantity,
            price: mappedCart.unit_price,
            product: mappedCart.Product.name,
          }));
          result.vendor = pendingOrder.Cart[0].Product.Vendor.store_name;
          result.cart = cart;
        }
        Response.setSuccess(200, 'Pending Order', result);
        return Response.send(res);
      }
      Response.setSuccess(200, 'Pending Order', pendingOrder);
      return Response.send(res);
    }
    Response.setError(400, 'Invalid User');
    return Response.send(res);
  }

  static async transact(req, res) {
    const data = req.body;
    const rules = {
      senderAddr: 'required|string',
      recieverAddr: 'required|string',
      amount: 'required|numeric',
    };

    const validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const senderExist = await db.Wallet.findOne({
      where: {
        address: data.senderAddr,
        CampaignId: null,
        [Op.or]: {
          AccountUserType: ['user', 'organisation'],
        },
      },
    });

    if (!senderExist) {
      Response.setError(404, 'Sender Wallet does not Exist');
      return Response.send(res);
    }

    const recieverExist = await db.Wallet.findOne({
      where: {
        address: data.recieverAddr,
        CampaignId: null,
        [Op.or]: {
          AccountUserType: ['user', 'organisation'],
        },
      },
    });

    if (!senderExist) {
      Response.setError(404, 'Reciever Wallet does not Exist');
      return Response.send(res);
    }

    if (senderExist.balance < data.amount) {
      Response.setError(
        422,
        'Sender Balance Insufficient to fund Transaction',
      );
      return Response.send(res);
    }
    let parentEntity; let
      parentType;
    if (senderExist.AccountUserType === 'organisation') {
      parentType = 'organisation';
      parentEntity = await db.Organisations.findByPk(
        senderExist.AccountUserId,
      );
    } else if (senderExist.AccountUserType === 'user') {
      parentType = 'user';
      parentEntity = await db.User.findByPk(senderExist.AccountUserId);
    }
    await parentEntity
      .createTransaction({
        walletSenderId: senderExist.uuid,
        walletRecieverId: recieverExist.uuid,
        amount: data.amount,
        narration:
              parentType === 'organisation'
                ? `Transfer to ${parentEntity.name}`
                : `Transfer to ${parentEntity.first_name} ${parentEntity.last_name}`,
      })
      .then((transaction) => {
        transferToQueue.send(
          new Message(
            {
              senderAddress: senderExist.address,
              senderPass: senderExist.privateKey,
              reciepientAddress: recieverExist.address,
              amount: data.amount,
              transaction: transaction.uuid,
            },
            {
              contentType: 'application/json',
            },
          ),
        );
      });

    Response.setSuccess(200, 'Payment Initiated');
    return Response.send(res);
  }

  static async checkOut(req, res) {
    const data = req.body;

    const rules = {
      userId: 'required|numeric',
      pin: 'required|numeric',
      orderId: 'required|numeric',
      campaign: 'campaign|numeric',
    };

    const validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    const user = await db.User.findOne({
      where: {
        id: data.userId,
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
        where: {
          CampaignId: null,
        },
      },
    });

    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }

    if (user.pin !== data.pin) {
      Response.setError(400, 'Invalid Pin');
      return Response.send(res);
    }

    const pendingOrder = await db.Order.findOne({
      where: {
        UserId: data.userId,
        status: 'pending',
      },
      include: {
        model: db.OrderProducts,
        as: 'Cart',
        include: {
          model: db.Products,
          as: 'Product',
          include: {
            model: db.Market,
            as: 'Vendor',
          },
        },
      },
    });

    if (pendingOrder && pendingOrder.Cart.length) {
      const sum = pendingOrder.Cart.reduce((a, b) => Number(a) + Number(b.total_amount), 0);
      if (user.Wallet[0].balance < sum) {
        Response.setError(
          400,
          'Insufficient Funds in Wallet to clear Cart Items',
        );
        return Response.send(res);
      }
      try {
        await db.sequelize.transaction(async () => {
          const vendor = await db.Wallet.findOne({
            where: {
              AccountUserId: pendingOrder.Cart[0].Product.Vendor.UserId,
              AccountUserType: 'user',
              CampaignId: null,
            },
          });
          let buyer; let
            type;

          const belongsToCampaign = await db.Beneficiaries.findOne({
            where: {
              CampaignId: data.campaign,
              UserId: vendor.AccountUserId,
            },
          });

          if (belongsToCampaign) {
            type = 'campaign';
            buyer = await db.Wallet.findOne({
              where: {
                AccountUserId: data.userId,
                AccountUserType: 'user',
                CampaignId: data.campaign,
              },
            });
          } else {
            type = 'main';
            buyer = await db.Wallet.findOne({
              where: {
                AccountUserId: data.userId,
                AccountUserType: 'user',
                CampaignId: null,
              },
            });
          }

          const ngo = await db.Wallet.findOne({
            where: {
              AccountUserType: 'organisation',
              CampaignId: data.campaign,
            },
          });

          await pendingOrder
            .createTransaction({
              walletSenderId: buyer.uuid,
              walletRecieverId: vendor.uuid,
              amount: sum,
              status: 'processing',
              is_approved: false,
              narration: `Payment for Order ${pendingOrder.OrderUniqueId}`,
            })
            .then(async (transaction) => {
              if (type === 'campaign') {
                const transferFromQueueMessage = {
                  ownerAddress: ngo.address,
                  recieverAddress: vendor.address,
                  spenderAddress: buyer.address,
                  senderKey: buyer.privateKey,
                  amount: sum,
                  transactionId: transaction.uuid,
                  pendingOrder: pendingOrder.id,
                };
                transferFromQueue.send(
                  new Message(transferFromQueueMessage, {
                    contentType: 'application/json',
                  }),
                );
              } else if (type === 'main') {
                const transferToQueueMessage = {
                  reciepientAddress: vendor.address,
                  senderAddress: buyer.address,
                  senderPass: buyer.privateKey,
                  amount: sum,
                  transaction: transaction.uuid,
                };

                transferToQueue.send(
                  new Message(transferToQueueMessage, {
                    contentType: 'application/json',
                  }),
                );
              }
              Response.setSuccess(200, 'Transfer Initiated');
              return Response.send(res);
            });
        });
      } catch (error) {
        Response.setError(500, error.message);
        return Response.send(res);
      }
    } else {
      Response.setError(400, 'No Item in Cart');
      return Response.send(res);
    }
    return null;
  }

  static async setAccountPin(req, res) {
    try {
      if (req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN already set. Chnage PIN or contact support.',
        );
        return Response.send(res);
      }
      const pin = createHash(req.body.pin.trim());
      await UserService.update(req.user.id, {
        pin,
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'PIN set successfully.');
      return Response.send(res);
    } catch (error) {
      console.log('setAccountPin', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'PIN update failed..',
      );
      return Response.send(res);
    }
  }

  static async updateAccountPin(req, res) {
    try {
      if (!req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN not found. Set PIN first.',
        );
        return Response.send(res);
      }

      if (!compareHash(req.body.old_pin, req.user.pin)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid or wrong old PIN.',
        );
        return Response.send(res);
      }
      const pin = createHash(req.body.new_pin);
      await UserService.update(req.user.id, {
        pin,
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'PIN changed successfully.',
      );
      return Response.send(res);
    } catch (error) {
      console.log('updateAccountPin', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'PIN update failed..',
      );
      return Response.send(res);
    }
  }

  static async beneficiaryWithdrawFromBankAccount(req, res) {
    const { amount, campaignId, accountno } = req.params;
    try {
      if (!Number(amount)) {
        Response.setError(400, 'Please input a valid amount');
        return Response.send(res);
      } if (!Number(campaignId)) {
        Response.setError(400, 'Please input a valid campaign ID');
        return Response.send(res);
      } if (!Number(accountno)) {
        Response.setError(400, 'Please input a valid campaign ID');
        return Response.send(res);
      }
      const bankAccount = await db.BankAccount.findOne({
        where: { UserId: req.user.id, account_number: accountno },
      });
      const userWallet = await WalletService.findUserCampaignWallet(
        req.user.id,
        campaignId,
      );
      const campaignWallet = await WalletService.findSingleWallet({
        CampaignId: campaignId,
        UserId: null,
      });
      if (!bankAccount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          "User Dos'nt Have a Bank Account",
        );
        return Response.send(res);
      }
      if (!userWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'User Wallet Not Found',
        );
        return Response.send(res);
      }
      if (!campaignWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign Wallet Not Found',
        );
        return Response.send(res);
      }
      if (!userWallet.balance > campaignWallet.balance) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Insufficient Fund',
        );
        return Response.send(res);
      }
      if (userWallet.balance < amount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Wallet Balance',
        );
        return Response.send(res);
      }

      await QueueService.fundBeneficiaryBankAccount(
        bankAccount,
        campaignWallet,
        userWallet,
        req.user.id,
        amount,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Processing',
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Please try again later.${error}`,
      );
      return Response.send(res);
    }
  }

  static async vendorWithdrawFromBankAccount(req, res) {
    const { amount, accountno } = req.params;
    try {
      if (!Number(amount)) {
        Response.setError(400, 'Please input a valid amount');
        return Response.send(res);
      }
      if (!Number(accountno)) {
        Response.setError(400, 'Please input a valid account number');
        return Response.send(res);
      }
      const bankAccount = await db.BankAccount.findOne({
        where: { UserId: req.user.id, account_number: accountno },
      });
      const userWallet = await db.Wallet.findOne({
        where: { UserId: req.user.id },
      });

      if (!bankAccount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          "User Dos'nt Have a Bank Account",
        );
        return Response.send(res);
      }
      if (!userWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'User Wallet Not Found',
        );
        return Response.send(res);
      }
      // if (userWallet.balance < amount) {
      //   Response.setSuccess(
      //     HttpStatusCode.STATUS_BAD_REQUEST,
      //     'Insufficient Wallet Balance'
      //   );
      //   return Response.send(res);
      // }
      await QueueService.fundVendorBankAccount(
        bankAccount,
        userWallet,
        req.user.id,
        amount,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Processing',
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Please try again later.${error}`,
      );
      return Response.send(res);
    }
  }

  static async createTicket(res) {
    // const {
    //   email, subject, phone, description,
    // } = req.body;
    // const rules = {
    //     subject: "required|alpha",
    //     description: "required|alpha",
    //     phone: ['required','regex:/^([0|\+[0-9]{1,5})?([7-9][0-9]{9})$/'],
    //     email: 'email|required',
    // }

    try {
      // const validation = new Validator(req.body, rules);
      // if (validation.fails()) {
      //   Response.setError(422, validation.errors);
      //   return Response.send(res);
      // } else {

      const crypto = await AwsUploadService.encrypt('jibril');
      console.log(crypto);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error${error}`,
      );
      return Response.send(res);
    }
    return null;
  }

  static async changePassword(req, res) {
    try {
      const { user } = req;
      const { old_password: oldPassword, new_password: newPassword } = SanitizeObject(req.body, [
        'old_password',
        'new_password',
      ]);

      if (!compareHash(oldPassword, user.password)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid old password',
        );
        return Response.send(res);
      }

      const password = createHash(newPassword);
      await UserService.update(user.id, {
        password,
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
      return Response.send(res);
    } catch (error) {
      console.log('ChangePassword', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Password update failed. Please retry.',
      );
      return Response.send(res);
    }
  }
}
module.exports = UsersController;
