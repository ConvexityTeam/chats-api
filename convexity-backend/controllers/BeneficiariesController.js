const BeneficiariesServices = require("../services/BeneficiariesService");
const util = require("../libs/Utils");
const db = require("../models");
const Validator = require("validatorjs");
const { Op } = require("sequelize");
const sequelize = require("sequelize");
class BeneficiariesController {
  static async getAllUsers(req, res) {
    try {
      const allUsers = await BeneficiariesServices.getAllUsers();
      if (allUsers.length > 0) {
        util.setSuccess(200, "Users retrieved", allUsers);
      } else {
        util.setSuccess(200, "No User found");
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
  static async createUser(req, res, next) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        password,
        OrganisationId,
        bvn,
        gender,
        marital_status,
        location,
        address,
        right_fingers,
        left_fingers,
        profile_pic,
      } = req.body;

      //check if email already exist
      db.User.findOne({
        where: { email: req.body.email, phone: req.body.phone },
      })
        .then((user) => {
          if (user !== null) {
            util.setError(400, "Email Already Exists, Recover Your Account");
            return util.send(res);
          }
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt).then((hash) => {
              const encryptedPassword = hash;
              const balance = 0.0;
              return db.User.create({
                RoleId: 5,
                OrganisationId: OrganisationId,
                first_name: first_name,
                last_name: last_name,
                phone: phone,
                email: email,
                password: encryptedPassword,
                gender: gender,
                marital_status: marital_status,
                balance: balance,
                bvn: bvn,
                status: 1,
                location: location,
                address: address,
                referal_id: "",
                pin: "",
                last_login: new Date(),
                right_fingers: right_fingers,
                left_fingers: left_fingers,
                profile_pic: profile_pic,
                // "balance","location","pin","blockchain_address","address","is_email_verified",
                // "is_phone_verified", "is_bvn_verified","is_self_signup","is_public","is_tfa_enabled",
                // "tfa_secret","is_organisation","organisation_id","last_login","createdAt","updatedAt"
              })
                .then((user) => {
                  util.setSuccess(201, "Account Successfully Created", user.id);
                  return util.send(res);
                })
                .catch((err) => {
                  util.setError(500, err);
                  return util.send(res);
                });
            });
          });
        })
        .catch((err) => {
          util.setError(500, err);
          return util.send(res);
        });
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
  }

  static async updatedUser(req, res) {
    const alteredUser = req.body;
    const { id } = req.params;
    if (!Number(id)) {
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }
    try {
      const updateUser = await BeneficiariesServices.updateUser(
        id,
        alteredUser
      );
      if (!updateUser) {
        util.setError(404, `Cannot find User with the id: ${id}`);
      } else {
        util.setSuccess(200, "User updated", updateUser);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async getAUser(req, res) {
    const { id } = req.params;

    if (!Number(id)) {
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }

    try {
      const theUser = await BeneficiariesServices.getAUser(id);
      if (!theUser) {
        util.setError(404, `Cannot find User with the id ${id}`);
      } else {
        util.setSuccess(200, "Found User", theUser);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async deleteUser(req, res) {
    const { id } = req.params;

    if (!Number(id)) {
      util.setError(400, "Please provide a numeric value");
      return util.send(res);
    }

    try {
      const UserToDelete = await BeneficiariesServices.deleteUser(id);

      if (UserToDelete) {
        util.setSuccess(200, "User deleted");
      } else {
        util.setError(404, `User with the id ${id} cannot be found`);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async createComplaint(req, res) {
    const data = req.body;
    const rules = {
      beneficiaryId: "required|numeric",
      report: "required|string",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const beneficiary_exist = await BeneficiariesServices.checkBeneficiary(
        data.beneficiaryId
      );
      if (beneficiary_exist) {
        const newComplaint = {
          BeneficiaryId: data.beneficiaryId,
          report: data.report,
        };
        const complaint = await BeneficiariesServices.createComplaint(
          newComplaint
        );
        util.setSuccess(200, "A new complaint has been made successfully");
        return util.send(res);
      } else {
        util.setError(422, "Beneficiary Id is Invalid");
        return util.send(res);
      }
    }
  }

  static async resolveComplaint(req, res) {
    const data = req.body;
    const rules = {
      complaintId: "required|numeric",
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const complaint_exist = await BeneficiariesServices.checkComplaint(
        data.complaintId
      );
      if (complaint_exist) {
        await BeneficiariesServices.updateComplaint(data.complaintId).then(
          () => {
            util.setSuccess(200, "Complaint Resolved successfully.");
            return util.send(res);
          }
        );
      } else {
        util.setError(422, "Complaint Id is Invalid");
        return util.send(res);
      }
    }
  }

  static async getComplaintsByBeneficiary(req, res) {
    const beneficiary = req.params.beneficiary;
    var whereCondtion = {
      BeneficiaryId: beneficiary,
    };
    if (req.query.status) {
      whereCondtion["status"] = req.query.status;
    }
    const page_val = req.query.page ? req.query.page : 1;
    const options = {
      page: page_val,
      paginate: 10,
      where: whereCondtion,
      order: [["id", "DESC"]],
    };
    const { docs, pages, total } = await db.Complaints.paginate(options);
    var nextPage = null;
    var prevPage = null;
    if (page_val != pages) {
      nextPage = Number(page_val) + 1;
    }

    if (page_val != 1) {
      prevPage = Number(page_val) - 1;
    }

    util.setSuccess(200, "Complaints Retrieved", {
      complaints: docs,
      current_page: options.page,
      pages: pages,
      total: total,
      nextPage: nextPage,
      prevPage: prevPage,
    });
    return util.send(res);
  }

  static async getBeneficiaryUserWallet(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await db.User.findOne({
      where: { id: beneficiary },
      include: {
        as: "Wallet",
        model: db.Wallet,
        attributes: {
          exclude: ["privateKey", "bantuAddress", "bantuPrivateKey"],
        },
      },
    });
    const campaigns = await db.Beneficiaries.findAll({
      where: { UserId: beneficiary },
      include: ["Campaign"],
    });
    if (beneficiary_exist) {
      util.setSuccess(200, "User Object.", {
        user: beneficiary_exist,
        associatedCampaigns: campaigns,
      });
      return util.send(res);
    } else {
      util.setError(422, "Beneficiary Id is Invalid");
      return util.send(res);
    }
  }

  static async getBeneficiaryUser(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await db.User.findByPk(beneficiary);
    const campaigns = await db.Beneficiaries.findAll({
      where: { UserId: beneficiary },
      include: ["Campaign"],
    });
    if (beneficiary_exist) {
      util.setSuccess(200, "User Object.", {
        user: beneficiary_exist,
        associatedCampaigns: campaigns,
      });
      return util.send(res);
    } else {
      util.setError(422, "Beneficiary Id is Invalid");
      return util.send(res);
    }
  }

  static async getComplaintsByCampaign(req, res) {
    let campaign = req.params.campaign;
    let status = req.query.status;
    let campaignExist = await db.Campaign.findByPk(campaign);
    if (!campaignExist) {
      util.setError(422, "Campaign Invalid");
      return util.send(res);
    }
    let whereQuery = {
      CampaignId: campaign,
    };
    let allowedStatus = ["resolved", "unresolved"];
    if (allowedStatus.includes(status)) {
      whereQuery["status"] = status;
    }
    const complaints = await db.Complaints.findAll({ where: whereQuery });
    util.setSuccess(200, "Complaints Retrieved", complaints);
    return util.send(res);
  }

  static async addAccount(req, res) {
    const data = req.body;
    const rules = {
      account_number: "required|numeric",
      bank_name: "required|string",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      await db.User.findByPk(req.user.id)
        .then(async (user) => {
          const account_exist = await db.Accounts.findOne({
            where: { UserId: req.user.id, account_number: data.account_number },
          });
          if (account_exist) {
            util.setError(400, "Account Number already added");
            return util.send(res);
          } else {
            await user
              .createAccount({
                account_number: data.account_number,
                bank_name: data.bank_name,
              })
              .then((response) => {
                util.setSuccess(201, "Account Added Successfully");
                return util.send(res);
              });
          }
        })
        .catch((error) => {
          util.setError(404, "Invalid User");
          return util.send(res);
        });
    }
  }
}

module.exports = BeneficiariesController;
