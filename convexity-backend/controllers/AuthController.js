const db = require("../models");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const util = require("../libs/Utils");
const Validator = require("validatorjs");
const formidable = require("formidable");
const uploadFile = require("./AmazonController");
const { Op } = require("sequelize");
var amqp_1 = require("./../libs/RabbitMQ/Connection");
const { Message } = require("@droidsolutions-oss/amqp-ts");
var ninVerificationQueue = amqp_1["default"].declareQueue("nin_verification", {
  durable: true,
});
var createWalletQueue = amqp_1["default"].declareQueue("createWallet", {
  durable: true,
});

const environ = process.env.NODE_ENV == "development" ? "d" : "p";

class AuthController {
  constructor() {
    this.emails = [];
  }
  static async normalRegistration(req, res) {
    var form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (err, fields, files) => {
      fields["today"] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        email: "required|email",
        phone: "required|numeric",
        gender: "required|in:male,female",
        address: "string",
        password: "required",
        dob: "required|date|before:today",
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        if (files.profile_pic) {
          const allowed_types = ["image/jpeg", "image/png", "image/jpg"];
          if (!allowed_types.includes(files.profile_pic.type)) {
            util.setError(
              400,
              "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture"
            );
            return util.send(res);
          }
        } else {
          util.setError(400, {
            errors: { profile_pic: ["Profile Pic Required"] },
          });
          return util.send(res);
        }

        const user_exist = await db.User.findOne({
          where: { email: fields.email },
        });
        if (user_exist) {
          util.setError(400, "Email Already Exists, Recover Your Account");
          return util.send(res);
        }

        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            console.log("Error Ocurred hashing");
          }
          bcrypt.hash(fields.password, salt).then(async (hash) => {
            const encryptedPassword = hash;
            await db.User.create({
              RoleId: 5,
              first_name: fields.first_name,
              last_name: fields.last_name,
              phone: fields.phone,
              email: fields.email,
              password: encryptedPassword,
              gender: fields.gender,
              address: fields.address,
              dob: fields.dob,
            })
              .then(async (user) => {
                createWalletQueue.send(
                  new Message(
                    {
                      id: user.id,
                      type: "user",
                    },
                    { contentType: "application/json" }
                  )
                );
                const extension = files.profile_pic.name.substring(
                  files.profile_pic.name.lastIndexOf(".") + 1
                );
                await uploadFile(
                  files.profile_pic,
                  "u-" + environ + "-" + user.id + "-i." + extension,
                  "convexity-profile-images"
                ).then((url) => {
                  user.update({ profile_pic: url });
                });

                util.setSuccess(201, "Account Onboarded Successfully");
                return util.send(res);
              })
              .catch((err) => {
                util.setError(500, err);
                return util.send(res);
              });
          });
        });
      }
    });
  }

  static async specialCaseRegistration(req, res) {
    var form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (err, fields, files) => {
      fields["today"] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        email: "email",
        referal_id: "string",
        phone: "required|numeric",
        gender: "required|in:male,female",
        address: "string",
        location: "string",
        nin: "required|digits_between:10,11",
        password: "required",
        dob: "required|date|before:today",
        nfc: "string",
        campaign: "required|numeric",
      };

      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        if (files.profile_pic) {
          // const allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];
          // if (!allowed_types.includes(files.profile_pic.type)) {
          //   util.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture");
          //   return util.send(res);
          // }
        } else {
          util.setError(400, "Profile Pic Required");
          return util.send(res);
        }
        let campaignExist = await db.Campaign.findByPk(fields.campaign);
        if (!campaignExist) {
          util.setError(400, "Invalid Campaign");
          return util.send(res);
        }

        let ninExist = await db.User.findOne({ where: { nin: fields.nin } });

        if (ninExist) {
          util.setError(400, "Nin has been taken");
          return util.send(res);
        }

        if (fields.email) {
          const user_exist = await db.User.findOne({
            where: { email: fields.email },
          });
          if (user_exist) {
            util.setError(400, "Email Already Exists, Recover Your Account");
            return util.send(res);
          }
        }
        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            console.log("Error Ocurred hashing");
          }
          bcrypt.hash(fields.password, salt).then(async (hash) => {
            const encryptedPassword = hash;
            await db.User.create({
              RoleId: 5,
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
            })
              .then(async (user) => {
                createWalletQueue.send(
                  new Message(
                    {
                      id: user.id,
                      type: "user",
                    },
                    { contentType: "application/json" }
                  )
                );

                const extension = files.profile_pic.name.substring(
                  files.profile_pic.name.lastIndexOf(".") + 1
                );
                await uploadFile(
                  files.profile_pic,
                  "u-" + environ + "-" + user.id + "-i." + extension,
                  "convexity-profile-images"
                ).then((url) => {
                  user.update({ profile_pic: url });
                });

                ninVerificationQueue.send(
                  new Message(user, { contentType: "application/json" })
                );
                if (campaignExist.type === "campaign") {
                  await user
                    .createBeneficiary({ CampaignId: fields.campaign })
                    .then(() => {
                      createWalletQueue.send(
                        new Message(
                          {
                            id: user.id,
                            campaign: fields.campaign,
                            type: "user",
                          },
                          { contentType: "application/json" }
                        )
                      );
                    });
                }
                util.setSuccess(201, "Account Onboarded Successfully", user.id);
                return util.send(res);
              })
              .catch((err) => {
                util.setError(500, err);
                return util.send(res);
              });
          });
        });
      }
    });
  }

  static async createUser(req, res) {
    var form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (err, fields, files) => {
      fields["today"] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        email: "email",
        referal_id: "string",
        phone: "required|numeric",
        gender: "required|alpha|in:male,female",
        address: "string",
        location: "string",
        password: "required",
        dob: "required|date|before:today",
        nfc: "string",
        campaign: "required|numeric",
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const allowed_types = ["image/jpeg", "image/png", "image/jpg"];

        if (!files.profile_pic) {
          util.setError(400, "profile_pic Required");
          return util.send(res);
        }
        // else if (!allowed_types.includes(files.profile_pic.type)) {
        //   util.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture");
        //   return util.send(res);
        // }
        if (files.fingerprints) {
          if (files.fingerprints.length >= 6) {
            var uploadFilePromises = [];

            // files.fingerprints.forEach((fingerprint) => {
            //   const limit = 2 * 1024 * 1024
            //   if (!allowed_types.includes(fingerprint.type)) {
            //     util.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for fingerprints");
            //     return util.send(res);
            //   }
            //    if (fingerprint.size > limit) {
            //     util.setError(400, "Fingerprint file must not exceed 2MB");
            //     return util.send(res);
            //   }
            // })
            let campaignExist = await db.Campaign.findByPk(fields.campaign);
            if (!campaignExist) {
              util.setError(400, "Invalid Campaign");
              return util.send(res);
            }
            const user_exist = await db.User.findOne({
              where: { email: fields.email },
            });
            if (user_exist) {
              util.setError(400, "Email Already Exists, Recover Your Account");
              return util.send(res);
            } else {
              bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                  console.log("Error Ocurred hashing");
                }
                bcrypt.hash(fields.password, salt).then(async (hash) => {
                  const encryptedPassword = hash;
                  await db.User.create({
                    RoleId: 5,
                    first_name: fields.first_name,
                    last_name: fields.last_name,
                    phone: fields.phone,
                    email: fields.email,
                    password: encryptedPassword,
                    gender: fields.gender,
                    status: "activated",
                    location: fields.location,
                    address: fields.address,
                    referal_id: fields.referal_id,
                    dob: fields.dob,
                  })
                    .then(async (user) => {
                      createWalletQueue.send(
                        new Message(
                          {
                            id: user.id,
                            type: "user",
                          },
                          { contentType: "application/json" }
                        )
                      );

                      var i = 0;
                      files.fingerprints.forEach(async (fingerprint) => {
                        let ext = fingerprint.name.substring(
                          fingerprint.name.lastIndexOf(".") + 1
                        );
                        uploadFilePromises.push(
                          uploadFile(
                            fingerprint,
                            "u-" +
                              environ +
                              "-" +
                              user.id +
                              "-fp-" +
                              ++i +
                              "." +
                              ext,
                            "convexity-fingerprints"
                          )
                        );
                      });
                      let extension = files.profile_pic.name.substring(
                        files.profile_pic.name.lastIndexOf(".") + 1
                      );
                      await uploadFile(
                        files.profile_pic,
                        "u-" + environ + "-" + user.id + "-i." + extension,
                        "convexity-profile-images"
                      ).then((url) => {
                        user.update({ profile_pic: url });
                      });
                      Promise.all(uploadFilePromises).then((responses) => {
                        responses.forEach(async (url) => {
                          await user.createPrint({ url: url });
                        });
                      });
                      if (campaignExist.type === "campaign") {
                        await user
                          .createBeneficiary({
                            CampaignId: fields.campaign,
                          })
                          .then(() => {
                            createWalletQueue.send(
                              new Message(
                                {
                                  id: user.id,
                                  campaign: fields.campaign,
                                  type: "user",
                                },
                                { contentType: "application/json" }
                              )
                            );
                          });
                      }
                      util.setSuccess(
                        201,
                        "Account Onboarded Successfully",
                        user.id
                      );
                      return util.send(res);
                    })
                    .catch((err) => {
                      util.setError(500, err.message);
                      return util.send(res);
                    });
                });
              });
            }
          } else {
            util.setError(400, "Minimum of 6 Fingerprints Required");
            return util.send(res);
          }
        } else {
          util.setError(400, "Fingerprints Required");
          return util.send(res);
        }
      }
    });
  }

  static async createAdminUser(req, res) {
    const data = req.body;
    const rules = {
      organisation_name: "required|string",
      email: "required|email",
      password: "required",
      website_url: "required|url",
    };
    const validation = new Validator(data, rules, {
      url: "Only valid url with https or http allowed",
    });
    if (validation.fails()) {
      util.setError(400, validation.errors);
      return util.send(res);
    } else {
      const url_string = data.website_url;
      const domain = extractDomain(url_string);
      const email = data.email;
      const re = "(\\W|^)[\\w.\\-]{0,25}@" + domain + "(\\W|$)";
      if (email.match(new RegExp(re))) {
        const userExist = await db.User.findOne({
          where: { email: data.email },
        });
        if (!userExist) {
          const organisationExist = await db.Organisations.findOne({
            where: {
              [Op.or]: [
                {
                  name: data.organisation_name,
                },
                {
                  website_url: data.website_url,
                },
              ],
            },
          });
          if (!organisationExist) {
            bcrypt.genSalt(10, (err, salt) => {
              if (err) {
                console.log("Error Ocurred hashing");
              }
              bcrypt.hash(data.password, salt).then(async (hash) => {
                const encryptedPassword = hash;
                await db.User.create({
                  RoleId: 2,
                  email: data.email,
                  password: encryptedPassword,
                })
                  .then(async (user) => {
                    createWalletQueue.send(
                      new Message(
                        {
                          id: user.id,
                          type: "user",
                        },
                        { contentType: "application/json" }
                      )
                    );
                    await db.Organisations.create({
                      name: data.organisation_name,
                      website_url: data.website_url,
                    }).then(async (organisation) => {
                      await organisation
                        .createMember({ UserId: user.id, role: "admin" })
                        .then(() => {
                          util.setSuccess(
                            200,
                            "NGO and User registered successfully"
                          );
                          return util.send(res);
                        });
                    });
                  })
                  .catch((err) => {
                    util.setError(500, err);
                    return util.send(res);
                  });
              });
            });
          } else {
            util.setError(
              400,
              "An Organisation with such name or website url already exist"
            );
            return util.send(res);
          }
        } else {
          util.setError(400, "Email Already Exists, Recover Your Account");
          return util.send(res);
        }
      } else {
        util.setError(400, "Email must end in @" + domain);
        return util.send(res);
      }
    }
  }

  static async signIn(req, res, next) {
    try {
      const { email, password } = req.body;
      db.User.findOne({
        where: { email: email },
        include: {
          model: db.OrganisationMembers,
          as: "AssociatedOrganisations",
          include: { model: db.Organisations, as: "Organisation" },
        },
      })
        .then((user) => {
          bcrypt
            .compare(password, user.password)
            .then((valid) => {
              //compare password of the retrieved value
              if (!valid) {
                //if not valid throw this error
                util.setError(401, "Invalid Login Credentials");
                return util.send(res);
              }
              const token = jwt.sign(
                {
                  user: user,
                },
                process.env.SECRET_KEY,
                {
                  expiresIn: "24hr",
                }
              );
              const resp = {
                user: user,
                token: token,
              };
              util.setSuccess(200, "Login Successful", resp);
              return util.send(res);
            })
            .catch((error) => {
              util.setError(500, error);
              return util.send(res);
            });
        })
        .catch((err) => {
          util.setError(400, "Invalid Login Credentials");
          return util.send(res);
        });
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async userDetails(req, res, next) {
    const id = req.params.id;
    try {
      db.User.findOne({
        where: { id: id },
      })
        .then((user) => {
          util.setSuccess(200, "Got Users Details", user);
          return util.send(res);
        })
        .catch((err) => {
          util.setError(404, "Users Record Not Found", err);
          return util.send(res);
        });
    } catch (error) {
      util.setError(404, "Users Record Not Found", error);
      return util.send(res);
    }
  }

  static async updateProfile(req, res, next) {
    const { firstName, lastName, email, phone } = req.body;
    const userId = req.body.userId;
    db.User.findOne({
      where: {
        id: userId,
      },
    })
      .then((user) => {
        if (user !== null) {
          //if there is a user
          return db.User.update(
            {
              firstName: firstName,
              lastName: lastName,
              phone: phone,
            },
            {
              where: {
                id: userId,
              },
            }
          ).then((updatedRecord) => {
            //respond with a success message
            res.status(201).json({
              status: "success",
              message: "Profile Updated Successfully!",
            });
          });
        }
      })
      .catch((err) => {
        res.status(404).json({
          status: "error",
          error: err,
        });
      });
  }
}

function extractDomain(url) {
  var domain;
  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf("://") > -1) {
    domain = url.split("/")[2];
  } else {
    domain = url.split("/")[0];
  }

  //find & remove www
  if (domain.indexOf("www.") > -1) {
    domain = domain.split("www.")[1];
  }

  domain = domain.split(":")[0]; //find & remove port number
  domain = domain.split("?")[0]; //find & remove url params

  return domain;
}

module.exports = AuthController;
