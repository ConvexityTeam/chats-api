const { Op } = require('sequelize');
const {
  AclRoles,
  OrgRoles,
  createHash,
  HttpStatusCode,
  generateOrganisationId,
  encryptData
} = require('../utils');
const { Message } = require('@droidsolutions-oss/amqp-ts');
const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Response, Logger } = require('../libs');
const { Beneficiary, Invites } = require('../models');
const Validator = require('validatorjs');
const formidable = require('formidable');
const uploadFile = require('./AmazonController');

const AuthService = require('../services/AuthService');
const amqp_1 = require('./../libs/RabbitMQ/Connection');
const {
  UserService,
  QueueService,
  MailerService,
  OrganisationService,
  CampaignService,
  WalletService
} = require('../services');
const ninVerificationQueue = amqp_1['default'].declareQueue(
  'nin_verification',
  {
    durable: true
  }
);
const createWalletQueue = amqp_1['default'].declareQueue('createWallet', {
  durable: true
});

const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';

class AuthController {
  static async verifyNin(req, res) {
    const data = req.body;

    const user = await db.User.findByPk(data.userId);
    if (user) {
      if (user.nin == null) {
        Response.setError(422, 'User has not supplied Nin Number');
        return Response.send(res);
      }
      ninVerificationQueue.send(
        new Message(user, {
          contentType: 'application/json'
        })
      );
      Response.setError(200, 'User Verification Initialised');
      return Response.send(res);
    } else {
      Response.setError(400, 'Invalid User');
      return Response.send(res);
    }
  }

  static async userDetails(req, res, next) {
    const id = req.params.id;
    try {
      db.User.findOne({
        where: {
          id: id
        }
      })
        .then(user => {
          Response.setSuccess(200, 'Got Users Details', user);
          return Response.send(res);
        })
        .catch(err => {
          Response.setError(404, 'Users Record Not Found', err);
          return Response.send(res);
        });
    } catch (error) {
      Response.setError(404, 'Users Record Not Found', error);
      return Response.send(res);
    }
  }

  static async updateProfile(req, res, next) {
    const { firstName, lastName, email, phone } = req.body;
    const userId = req.body.userId;
    db.User.findOne({
      where: {
        id: userId
      }
    })
      .then(user => {
        if (user !== null) {
          //if there is a user
          return db.User.update(
            {
              firstName: firstName,
              lastName: lastName,
              phone: phone
            },
            {
              where: {
                id: userId
              }
            }
          ).then(updatedRecord => {
            res.status(201).json({
              status: 'success',
              message: 'Profile Updated Successfully!'
            });
          });
        }
      })
      .catch(err => {
        res.status(404).json({
          status: 'error',
          error: err
        });
      });
  }
  static async beneficiariesExcel(req, res) {
  
   var form = new formidable.IncomingForm({
    multiples: true
  });
  form.parse(req, async (err, fields, files) => {
    fields['today'] = new Date(Date.now()).toDateString();
   //allowed file types .xls, .csv, .xlsx
    const allowed_types = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const beneficiariesFile =null;
      if (!files.beneficiaries_xls) {
        Response.setError(400, 'Beneficiaries Records required');
        return Response.send(res);
      } else if (!allowed_types.includes(files.beneficiaries_xls.type)) {
        Response.setError(400, "Invalid File type. Only csv, xls, and xlsx files allowed for Beneficiaries Records");
        return Response.send(res);
      }else {
      //upload excel file
    await uploadFile( files.beneficiaries_xls,'u-' + environ + '-' + user.id + '-i.' + extension,'convexity-beneficiaries-csv')
    .then(url => {
      user.update({
        beneficiariesFile: url
      });
    });
      //read uploaded excel file
      console.log(beneficiariesFile);
    //match records to the right column
   // ensure that creator of beneficiary belongs to the organisation that owns campaing
      }
    });
  }

  


static async beneficiariesKoboToolBox(req,res){
const kTBoxURL='https://[kpi]/api/v2/assets/{asset_uid}.json';
//fetch from their url
//read into json
//match records to right data column 
//save to db
//send responses
}

  static async beneficiaryRegisterSelf(req, res) {
    try {
      const RoleId = AclRoles.Beneficiary;
      const { phone, email, country, state, coordinates, device_imei } = req.body;
      const files = req.file;
      const rules = {
        email: 'email|required',
        password: 'required',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        country: 'string|required',
        state: 'string|required',
        device_imei: 'string|required'
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        if (!files) {
        }
        const userByEmail = await db.User.findOne({ where: { email } });
        const userDevice = await db.User.findOne({ where: { device_imei } });
        if (userByEmail) {
          Response.setError(400, 'User With This Email Exist');
          return Response.send(res);
        }
        if (userDevice) {
          Response.setError(400, 'device already registered');
          return Response.send(res);
        } else {
          const password = createHash(req.body.password);

          const extension = req.file.mimetype.split('/').pop();

          const profile_pic = await uploadFile(
            files,
            'u-' + environ + '-' + email + '-i.' + extension,
            'convexity-profile-images'
          );

          const user = await UserService.addUser({
            RoleId,
            phone,
            email,
            password,
            profile_pic,
            location: JSON.stringify({ country, state, coordinates })
          });

          if (user) await QueueService.createWallet(user.id, 'user');
          Response.setSuccess(201, 'Account Onboarded Successfully', user);
          return Response.send(res);
        }
      }
    } catch (error) {
      Response.setError(500, 'On-boarding failed. Please try again later.');
    }
  }

  static async sCaseCreateBeneficiary(req, res) {
    var form = new formidable.IncomingForm({
      multiples: true
    });
    form.parse(req, async (err, fields, files) => {
      fields['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'email',
        referal_id: 'string',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        gender: 'required|in:male,female',
        address: 'string',
        location: 'string',
        password: 'required',
        dob: 'required|date|before:today',
        nfc: 'string',
        campaign: 'required|numeric',
        // pin: 'size:4|required' //pin validation disabled
      };

      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Logger.error(`Validation Error: ${JSON.stringify(validation.errors)}`);
        Response.setError(400, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      } else {
        if (files.profile_pic) {
          // const allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];
          // if (!allowed_types.includes(files.profile_pic.type)) {
          //   Response.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture");
          //   return Response.send(res);
          // }
        } else {
          Logger.error('Profile Pic Required');
          Response.setError(400, 'Profile Pic Required');
          return Response.send(res);
        }

        let campaignExist = await db.Campaign.findOne({
          where: {
            id: fields.campaign,
            type: 'campaign'
          }
        });

        if (!campaignExist) {
          Logger.error('Invalid Campaign');
          Response.setError(400, 'Invalid Campaign');
          return Response.send(res);
        }

        let ninExist = await db.User.findOne({
          where: {
            nin: fields.nin
          }
        });

        if (ninExist) {
          Response.setError(400, 'Nin has been taken');
          return Response.send(res);
        }

        if (fields.email) {
          const user_exist = await db.User.findOne({
            where: {
              email: fields.email
            }
          });
          if (user_exist) {
            Response.setError(
              400,
              'Email Already Exists, Recover Your Account'
            );
            return Response.send(res);
          }
        }
        const encryptedPin = createHash('0000');//setting default pin to zero //createHash(fields.pin);
        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            console.log('Error Ocurred hashing');
          }
          bcrypt.hash(fields.password, salt).then(async hash => {
            const encryptedPassword = hash;
            await db.User.create({
              RoleId: AclRoles.Beneficiary,
              first_name: fields.first_name,
              last_name: fields.last_name,
              phone: fields.phone,
              email: fields.email ? fields.email : null,
              password: encryptedPassword,
              gender: fields.gender,
              nin: fields.nin,
              location: fields.location ? fields.location : null,
              address: fields.address,
              referal_id: fields.referal_id,
              nfc: fields.nfc,
              dob: fields.dob,
              pin: encryptedPin
            })
              .then(async user => {
                await QueueService.createWallet(user.id, 'user');
                const extension = files.profile_pic.name.substring(
                  files.profile_pic.name.lastIndexOf('.') + 1
                );
                await uploadFile(
                  files.profile_pic,
                  'u-' + environ + '-' + user.id + '-i.' + extension,
                  'convexity-profile-images'
                ).then(url => {
                  user.update({
                    profile_pic: url
                  });
                });

                // ninVerificationQueue.send(
                //   new Message(user, {
                //     contentType: "application/json"
                //   })
                // );
                if (campaignExist.type === 'campaign') {
                  await Beneficiary.create({
                    UserId: user.id,
                    CampaignId: campaignExist.id,
                    approved: true,
                    source: 'field app'
                  }).then(async () => {
                    await QueueService.createWallet(
                      user.id,
                      'user',
                      fields.campaign
                    );
                  });
                }
                // const data = await encryptData(
                //   JSON.stringify({
                //     id: user.id,
                //     email: fields.email,
                //     phone: fields.phone
                //   })
                // );

                Response.setSuccess(
                  201,
                  'Account Onboarded Successfully',
                  user.id
                );
                return Response.send(res);
              })
              .catch(err => {
                Response.setError(500, err);
                return Response.send(res);
              });
          });
        });
      }
    });
  }

  static async createBeneficiary(req, res) {
    // ensure that creator of beneficiary belongs to the organisation that owns campaing
    var form = new formidable.IncomingForm({
      multiples: true
    });
    form.parse(req, async (err, fields, files) => {
      fields['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'email',
        referal_id: 'string',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        gender: 'required|alpha|in:male,female',
        address: 'string',
        location: 'string',
        password: 'required',
        dob: 'required|date|before:today',
        nfc: 'string',
        campaign: 'required|numeric',
        // pin: 'size:4|required' //disabled for now
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Response.setError(400, validation.errors);
        return Response.send(res);
      } else {
        const allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];

        if (!files.profile_pic) {
          Response.setError(400, 'Profile picture required');
          return Response.send(res);
        }
        // else if (!allowed_types.includes(files.profile_pic.type)) {
        //   Response.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture");
        //   return Response.send(res);
        // }
        if (files.fingerprints) {
          if (files.fingerprints.length >= 6) {
            var uploadFilePromises = [];

            // files.fingerprints.forEach((fingerprint) => {
            //   const limit = 2 * 1024 * 1024
            //   if (!allowed_types.includes(fingerprint.type)) {
            //     Response.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for fingerprints");
            //     return Response.send(res);
            //   }
            //    if (fingerprint.size > limit) {
            //     Response.setError(400, "Fingerprint file must not exceed 2MB");
            //     return Response.send(res);
            //   }
            // })
            let campaignExist = await db.Campaign.findOne({
              where: {
                id: fields.campaign,
                type: 'campaign'
              }
            });

            if (!campaignExist) {
              Response.setError(400, 'Invalid Campaign ID');
              return Response.send(res);
            }
            const user_exist = await db.User.findOne({
              where: {
                email: fields.email
              }
            });
            if (user_exist) {
              Response.setError(
                400,
                'Email Already Exists, Recover Your Account'
              );
              return Response.send(res);
            } else {
              bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                  console.log('Error Ocurred hashing');
                }
                const encryptedPin = createHash(fields.pin);
                bcrypt.hash(fields.password, salt).then(async hash => {
                  const encryptedPassword = hash;
                  await db.User.create({
                    RoleId: AclRoles.Beneficiary,
                    first_name: fields.first_name,
                    last_name: fields.last_name,
                    phone: fields.phone,
                    email: fields.email,
                    password: encryptedPassword,
                    gender: fields.gender,
                    status: 'activated',
                    location: fields.location,
                    address: fields.address,
                    referal_id: fields.referal_id,
                    dob: fields.dob,
                    pin: encryptedPin
                  })
                    .then(async user => {
                      await QueueService.createWallet(user.id, 'user');

                      var i = 0;
                      files.fingerprints.forEach(async fingerprint => {
                        let ext = fingerprint.name.substring(
                          fingerprint.name.lastIndexOf('.') + 1
                        );
                        uploadFilePromises.push(
                          uploadFile(
                            fingerprint,
                            'u-' +
                            environ +
                            '-' +
                            user.id +
                            '-fp-' +
                            ++i +
                            '.' +
                            ext,
                            'convexity-fingerprints'
                          )
                        );
                      });
                      let extension = files.profile_pic.name.substring(
                        files.profile_pic.name.lastIndexOf('.') + 1
                      );
                      await uploadFile(
                        files.profile_pic,
                        'u-' + environ + '-' + user.id + '-i.' + extension,
                        'convexity-profile-images'
                      ).then(url => {
                        user.update({
                          profile_pic: url
                        });
                      });
                      Promise.all(uploadFilePromises).then(responses => {
                        responses.forEach(async url => {
                          await user.createPrint({
                            url: url
                          });
                        });
                      });
                      if (campaignExist.type === 'campaign') {
                        await Beneficiary.create({
                          UserId: user.id,
                          CampaignId: campaignExist.id,
                          approved: true,
                          source: 'field app'
                        }).then(async () => {
                          await QueueService.createWallet(
                            user.id,
                            'user',
                            fields.campaign
                          );
                        });
                      }
                      // const data = await encryptData(
                      //   JSON.stringify({
                      //     id: user.id,
                      //     email: fields.email,
                      //     phone: fields.phone
                      //   })
                      // );
                      Response.setSuccess(
                        201,
                        'Account Onboarded Successfully',
                        user.id
                      );
                      return Response.send(res);
                    })
                    .catch(err => {
                      Response.setError(500, err.message);
                      return Response.send(res);
                    });
                });
              });
            }
          } else {
            Response.setError(400, 'Minimum of 6 Fingerprints Required');
            return Response.send(res);
          }
        } else {
          Response.setError(400, 'Fingerprints Required');
          return Response.send(res);
        }
      }
    });
  }

  static async createNgoAccount(req, res) {
    let user = null;
    const data = req.body;
    const rules = {
      organisation_name: 'required|string',
      email: 'required|email',
      password: 'required',
      website_url: 'required|url'
    };
    const validation = new Validator(data, rules, {
      url: 'Only valid url with https or http allowed'
    });
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    } else {
      const url_string = data.website_url;
      const domain = extractDomain(url_string);
      const email = data.email;
      const re = '(\\W|^)[\\w.\\-]{0,25}@' + domain + '(\\W|$)';
      if (email.match(new RegExp(re))) {
        const userExist = await db.User.findOne({
          where: {
            email: data.email
          }
        });
        if (!userExist) {
          const organisationExist = await db.Organisation.findOne({
            where: {
              [Op.or]: [
                {
                  name: data.organisation_name
                },
                {
                  website_url: data.website_url
                }
              ]
            }
          });
          if (!organisationExist) {
            bcrypt.genSalt(10, (err, salt) => {
              if (err) {
                console.log('Error Ocurred hashing');
              }
              bcrypt.hash(data.password, salt).then(async hash => {
                const encryptedPassword = hash;
                await db.User.create({
                  RoleId: AclRoles.NgoAdmin,
                  email: data.email,
                  password: encryptedPassword
                })
                  .then(async _user => {
                    user = _user;
                    //QueueService.createWallet(user.id, 'user');
                    await db.Organisation.create({
                      name: data.organisation_name,
                      email: data.email,
                      website_url: data.website_url,
                      registration_id: generateOrganisationId()
                    }).then(async organisation => {
                      await QueueService.createWallet(
                        organisation.id,
                        'organisation'
                      );
                      await organisation
                        .createMember({
                          UserId: user.id,
                          role: OrgRoles.Admin
                        })
                        .then(() => {
                          Response.setSuccess(
                            201,
                            'NGO and User registered successfully',
                            {
                              user: user.toObject(),
                              organisation
                            }
                          );
                          return Response.send(res);
                        });
                    });
                  })
                  .catch(err => {
                    Response.setError(500, err);
                    return Response.send(res);
                  });
              });
            });
          } else {
            Response.setError(
              400,
              'An Organisation with such name or website url already exist'
            );
            return Response.send(res);
          }
        } else {
          Response.setError(400, 'Email Already Exists, Recover Your Account');
          return Response.send(res);
        }
      } else {
        Response.setError(400, 'Email must end in @' + domain);
        return Response.send(res);
      }
    }
  }

  // Refactored Methods

  static async signIn(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      const data = await AuthService.login(user, req.body.password.trim());
      // if (
      //   user.RoleId === AclRoles.Donor ||
      //   user.RoleId === AclRoles.FieldAgent ||
      //   user.RoleId === AclRoles.Vendor
      // ) {
      //   Response.setError(
      //     HttpStatusCode.STATUS_FORBIDDEN,
      //     'Access Denied, Unauthorised Access'
      //   );
      //   return Response.send(res);
      // }
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInNGO(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      if (user && user.RoleId != AclRoles.NgoAdmin) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const orgId = user.AssociatedOrganisations[0].OrganisationId;
      const orgWallet = await WalletService.findMainOrganisationWallet(orgId);
      if (!orgWallet) {
        await QueueService.createWallet(orgId, 'organisation');
      }
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      const data = await AuthService.login(user, req.body.password);
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInField(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      if (user && user.RoleId !== AclRoles.FieldAgent) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      const data = await AuthService.login(user, req.body.password);
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async donorSignIn(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      if (user && user.RoleId !== AclRoles.Donor) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }

      const donorMainOrg = await OrganisationService.checkExistEmail(
        req.body.email
      );
      user.dataValues.mainOrganisation = donorMainOrg;
      const wallet = await WalletService.findSingleWallet({
        OrganisationId: user.id
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'organisation');
      }
      const data = await AuthService.login(user, req.body.password.trim());

      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  // static async signInField(req, res) {
  //   try {
  //     const user = await db.User.findOne({
  //       where: {
  //         email: req.body.email
  //       },
  //       include: {
  //         model: db.OrganisationMembers,
  //         as: 'AssociatedOrganisations',
  //         include: {
  //           model: db.Organisation,
  //           as: 'Organisation'
  //         }
  //       }
  //     });
  //     if (user && user.RoleId !== AclRoles.FieldAgent) {
  //       Response.setError(
  //         HttpStatusCode.STATUS_FORBIDDEN,
  //         'Access Denied, Unauthorised Access'
  //       );
  //       return Response.send(res);
  //     }
  //     const data = await AuthService.login(user, req.body.password);

  //     Response.setSuccess(200, 'Login Successful.', data);
  //     return Response.send(res);
  //   } catch (error) {
  //     const message =
  //       error.status == 401
  //         ? error.message
  //         : 'Login failed. Please try again later.';
  //     Response.setError(401, message);
  //     return Response.send(res);
  //   }
  // }
  static async signInBeneficiary(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      if (user && user.RoleId !== AclRoles.Beneficiary) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      const data = await AuthService.login(user, req.body.password);
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInVendor(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          vendor_id: req.body.vendor_id
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      if (user && user.RoleId !== AclRoles.Vendor) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const data = await AuthService.login(
        user,
        req.body.password.trim(),
        AclRoles.Vendor
      );
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInAdmin(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      const data = await AuthService.login(
        user,
        req.body.password.trim(),
        AclRoles.SuperAdmin
      );
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401
          ? error.message
          : 'Login failed. Please try again later.';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async setTwoFactorSecret(req, res) {
    try {
      const data = await AuthService.add2faSecret(req.user);
      Response.setSuccess(200, '2FA Data Generated', data);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  static async enableTwoFactorAuth(req, res) {
    // TODO: Validate token
    try {
      const token = req.body.otp || req.query.otp;

      if (!token) {
        Response.setError(422, `OTP is required.`);
        return Response.send(res);
      }

      const user = await AuthService.enable2afCheck(req.user, token);
      Response.setSuccess(200, 'Two factor authentication enabled.', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  static async disableTwoFactorAuth(req, res) {
    // TODO: Validate token
    try {
      const user = await AuthService.disable2afCheck(req.user);
      if (user)
        Response.setSuccess(200, 'Two factor authentication disabled.', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  static async toggleTwoFactorAuth(req, res) {
    // TODO: Validate token
    try {
      const user = await AuthService.toggle2afCheck(req.user);
      if (user)
        Response.setSuccess(200, 'Two factor authentication disabled.', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  static async state2fa(req, res) {
    // TODO: Validate token
    try {
      const user = await AuthService.state2fa(req.user);
      if (user) Response.setSuccess(200, 'Two State', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  static async requestPasswordReset(req, res) {
    try {
      const data = await AuthService.createResetPassword(req.user.id, req.ip);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Token generated.',
        data.toObject()
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed please try again.'
      );
      return Response.send(res);
    }
  }

  // static async resetPassword(req, res) {
  //   try {
  //     await AuthService.updatedPassord(req.user, req.body.password);
  //     Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
  //     return Response.send(res);
  //   } catch (error) {
  //     Response.setError(
  //       HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
  //       'Reset password request failed. Please try again.'
  //     );
  //     return Response.send(res);
  //   }
  // }

  static async sendInvite(req, res) {
    const { inviteeEmail, message, link } = req.body;
    const { organisation_id, campaign_id } = req.params;
    try {
      const rules = {
        'inviteeEmail*': 'email|required',
        link: 'required|url'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      let user_exist = false;
      const campaign = await CampaignService.getCampaignById(campaign_id);
      for (let email of inviteeEmail) {
        const [ngo, donor] = await Promise.all([
          OrganisationService.checkExist(organisation_id),

          OrganisationService.checkExistEmail(email)
        ]);
        const token = await AuthService.inviteDonor(
          email,
          organisation_id,
          campaign_id
        );

        if (!donor) {
          user_exist = false;
          await MailerService.sendInvite(
            email,
            token,
            campaign,
            ngo.name,
            false,
            message,
            link
          );
        } else {
          user_exist = true;
          await MailerService.sendInvite(
            email,
            token,
            campaign,
            ngo.name,
            true,
            message,
            link
          );
        }
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Invite sent to donor.',
        { campaignId: campaign.id, is_public: campaign.is_public, user_exist }
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async resetPassword(req, res) {
    try {
      await AuthService.updatedPassord(req.user, req.body.password);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Reset password request failed. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async confirmInvite(req, res) {
    const { token, campaignId } = req.params;
    try {
      const rules = {
        token: 'required|string',
        campaignId: 'integer|required'
      };
      const validation = new Validator(req.params, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const [campaign, token_exist] = await Promise.all([
        CampaignService.getCampaignById(campaignId),
        db.Invites.findOne({ where: { token } })
      ]);
      const userExist = await UserService.findSingleUser({
        email: token_exist.email
      });
      let user_exist = false;
      if (userExist) {
        user_exist = true;
      }
      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign ID Not Found'
        );
        return Response.send(res);
      }
      jwt.verify(token, process.env.SECRET_KEY, async (err, payload) => {
        if (err) {
          Response.setError(
            HttpStatusCode.STATUS_UNAUTHORIZED,
            'Unauthorised. Token Invalid'
          );
          return Response.send(res);
        }
        const ngo = await OrganisationService.checkExist(token_exist.inviterId);
        const donor = await OrganisationService.checkExistEmail(
          token_exist.email
        );

        const isAdded = await db.Invites.findOne({
          where: { CampaignId: campaignId, token, isAdded: false }
        });

        if (!ngo) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            "You don't have access to view this campaign"
          );
          return Response.send(res);
        }

        if (!isAdded) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            "You don't have access to view this campaign"
          );
          return Response.send(res);
        }
        if (donor) {
          const associate = await db.AssociatedCampaign.findOne({
            where: {
              DonorId: donor.id,
              CampaignId: campaignId
            }
          });

          if (associate) {
            Response.setSuccess(
              HttpStatusCode.STATUS_OK,
              'You already have access to this campaign'
            );
            return Response.send(res);
          }
          await db.AssociatedCampaign.create({
            DonorId: donor.id,
            CampaignId: campaignId
          });
        }

        await isAdded.update({ isAdded: true });
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'campaign invitation has been confirmed',
          {
            campaignId,
            is_public: campaign.is_public,
            user_exist,
            email: token_exist.email
          }
        );
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async createDonorAccount(req, res) {
    const data = req.body;
    try {
      const rules = {
        organisation_name: 'string',
        password: 'required',
        website_url: 'url',
        campaignId: 'integer|required',
        email: 'email|required'
      };
      const validation = new Validator(data, rules, {
        url: 'Only valid url with https or http allowed'
      });
      if (validation.fails()) {
        Response.setError(400, validation.errors);
        return Response.send(res);
      }
      const [campaign, exist] = await Promise.all([
        CampaignService.getCampaignById(data.campaignId),
        db.Invites.findOne({
          where: { email: data.email, isAdded: true, CampaignId: data.campaignId }
        })
      ]);

      const url_string = data.website_url;
      const email = data.email;
      if (url_string) {
        const domain = extractDomain(url_string);

        const re = '(\\W|^)[\\w.\\-]{0,25}@' + domain + '(\\W|$)';
        if (!email.match(new RegExp(re))) {
          Response.setError(400, 'Email must end in @' + domain);
          return Response.send(res);
        }
      }

      const userExist = await UserService.findSingleUser({
        email: email
      });

      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign ID Not Found'
        );
        return Response.send(res);
      }

      if (userExist) {
        Response.setError(400, 'Email Already Exists, Recover Your Account');
        return Response.send(res);
      }
      // const isAdded = await db.Invites.findOne({
      //   where: {
      //     CampaignId: data.campaignId,
      //     email: data.email,
      //     isAdded: true
      //   }
      // });

      if (!exist) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          "You don't have access to view this campaign"
        );
        return Response.send(res);
      }
      const ass = await db.AssociatedCampaign.findOne({
        where: {
          DonorId: createdOrganisation.id,
          CampaignId: data.campaignId
        }
      });

      if (ass) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Already on campaign'
        );
        return Response.send(res);
      }
      // const organisationExist = await db.Organisation.findOne({
      //   where: {
      //     [Op.or]: [
      //       {
      //         name: data.organisation_name
      //       },
      //       {
      //         website_url: data.website_url
      //       }
      //     ]
      //   }
      // });
      // if (organisationExist) {
      //   Response.setError(
      //     400,
      //     'An Organisation with such name or website url already exist'
      //   );
      //   return Response.send(res);
      // }

      const password = createHash(req.body.password);
      const user = await UserService.addUser({
        RoleId: AclRoles.Donor,
        email: data.email,
        password
      });

      const createdOrganisation = await db.Organisation.create({
        name: data.organisation_name || 'no org',
        email: data.email,
        website_url: data.website_url || 'null',
        registration_id: generateOrganisationId()
      });

      await db.OrganisationMembers.create({
        UserId: user.id,
        role: 'donor',
        OrganisationId: exist.inviterId
      });
      await db.AssociatedCampaign.create({
        DonorId: createdOrganisation.id,
        CampaignId: data.campaignId
      });

      await QueueService.createWallet(createdOrganisation.id, 'organisation');

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Donor and User registered successfully',
        createdOrganisation
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error, Contact Support'
      );
      return Response.send(res);
    }
  }
}

function extractDomain(url) {
  var domain;
  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf('://') > -1) {
    domain = url.split('/')[2];
  } else {
    domain = url.split('/')[0];
  }

  //find & remove www
  if (domain.indexOf('www.') > -1) {
    domain = domain.split('www.')[1];
  }

  domain = domain.split(':')[0]; //find & remove port number
  domain = domain.split('?')[0]; //find & remove url params

  return domain;
}

module.exports = AuthController;
