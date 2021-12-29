const {
  BeneficiaryService,
  WalletService,
  CampaignService
} = require("../services");
const util = require("../libs/Utils");
const db = require("../models");
const Validator = require("validatorjs");

const {
  Response
} = require("../libs");

const moment = require('moment')
const {
  HttpStatusCode,
  BeneficiarySource
} = require("../utils");
class BeneficiariesController {

  static async getAllUsers(req, res) {
    try {
      const allUsers = await BeneficiaryService.getAllUsers();
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
          where: {
            email: req.body.email,
            phone: req.body.phone
          },
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
    const {
      id
    } = req.params;
    if (!Number(id)) {
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }
    try {
      const updateUser = await BeneficiaryService.updateUser(
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
    const {
      id
    } = req.params;

    if (!Number(id)) {
      util.setError(400, "Please input a valid numeric value");
      return util.send(res);
    }

    try {
      const theUser = await BeneficiaryService.getAUser(id);
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
    const {
      id
    } = req.params;

    if (!Number(id)) {
      util.setError(400, "Please provide a numeric value");
      return util.send(res);
    }

    try {
      const UserToDelete = await BeneficiaryService.deleteUser(id);

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
      const beneficiary_exist = await BeneficiaryService.checkBeneficiary(
        data.beneficiaryId
      );
      if (beneficiary_exist) {
        const newComplaint = {
          BeneficiaryId: data.beneficiaryId,
          report: data.report,
        };
        const complaint = await BeneficiaryService.createComplaint(
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
      const complaint_exist = await BeneficiaryService.checkComplaint(
        data.complaintId
      );
      if (complaint_exist) {
        await BeneficiaryService.updateComplaint(data.complaintId).then(
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
      order: [
        ["id", "DESC"]
      ],
    };
    const {
      docs,
      pages,
      total
    } = await db.Complaints.paginate(options);
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
      where: {
        id: beneficiary
      },
      include: {
        as: "Wallet",
        model: db.Wallet,
        attributes: {
          exclude: ["privateKey", "bantuAddress", "bantuPrivateKey"],
        },
      },
    });
    const campaigns = await db.Beneficiaries.findAll({
      where: {
        UserId: beneficiary
      },
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
      where: {
        UserId: beneficiary
      },
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
    const complaints = await db.Complaints.findAll({
      where: whereQuery
    });
    util.setSuccess(200, "Complaints Retrieved", complaints);
    return util.send(res);
  }

  // Refactored
  static async joinCampaign(req, res) {
    try {
      const campaign = req.campaign;
      const beneficiaryId = req.beneficiary_id;
      if (campaign.status !== 'active') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign is not active.');
        return Response.send(res);
      }

      const beneficiary = await CampaignService.addBeneficiary(campaign.id, beneficiaryId, BeneficiarySource.beneficiary);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Beneficiary Added.', beneficiary);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }

  }

  // Refactored

  static async leaveCampaign(req, res) {
    try {
      const campaign = req.campaign;
      const beneficiaryId = req.beneficiary_id;
      if (campaign.status == 'completed') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign is already completed.');
        return Response.send(res);
      }
      await CampaignService.removeBeneficiary(campaign.id, beneficiaryId);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary removed successfully');
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }
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
            where: {
              UserId: req.user.id,
              account_number: data.account_number
            },
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
  static async getWallets(req, res) {
    try {
      const Wallets = await WalletService.findUserWallets(req.user.id);
      const total_balance = Wallets.map(wallet => wallet.balance).reduce((a, b) => a + b, 0);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary wallets', {
        total_balance,
        Wallets
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }
  }

  // Register By Organisation Special Case
  static async registerSpecialCaseBeneficiary(req, res) {}

  static async registerBeneficiary(req, res) {}

  static async getProfile(req, res) {
    try {
      let total_wallet_spent = 0;
      let total_wallet_balance = 0;
      let total_wallet_received = 0;

      const _beneficiary = await BeneficiaryService.beneficiaryProfile(req.user.id);
      const Wallets = _beneficiary.Wallets.map(wallet => {
        total_wallet_balance += wallet.balance;
        // total_wallet_spent += wallet.SentTransactions.map(tx => tx.amount).reduce((a, b) => a + b, 0);
        // total_wallet_received += wallet.ReceivedTransactions.map(tx => tx.amount).reduce((a, b) => a + b, 0);
        const w = wallet.toObject();
        // delete w.ReceivedTransactions;
        // delete w.SentTransactions;
        return w;
      });

      const beneficiary = _beneficiary.toObject();

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary Profile.', {
        total_wallet_balance,
        total_wallet_received,
        total_wallet_spent,
        ...beneficiary,
        Wallets
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
      return Response.send(res);
    }
  }
  static async beneficaryTransactions(req, res) {
    try {
      const beneficiary = req.beneficiary.toJSON();
      const Transactions = await BeneficiaryService.beneficiaryTransactions(beneficiary.id);
      const transactions_count = Transactions.length;
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary Transactions.', {
        ...beneficiary,
        transactions_count,
        Transactions
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
      return Response.send(res);
    }
  }

  static async beneficiariesByGender(req, res) {

    try {

      let male = 0
      let female = 0

      const beneficiaries = await BeneficiaryService.getBeneficiaries();

      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {

          if (beneficiaries[i].gender == 'male') {
            male++
          } else if (beneficiaries[i].gender == 'female') {
            female++
          }
        }

        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary By Gender Retrieved.', {
          male,
          female
        });
        return Response.send(res);
      }
<<<<<<< HEAD
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Gender Retrieved.', {male, female});
=======

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Gender Retrieved.');
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      return Response.send(res);



    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
      return Response.send(res);
    }
  }

  static async beneficiariesByAgeGroup(req, res) {

    try {

      let eighteenTo29 = 0
      let thirtyTo41 = 0
      let forty2To53 = 0
      let fifty4To65 = 0
      let sixty6Up = 0


      const beneficiaries = await BeneficiaryService.getBeneficiaries();

      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {

          if (parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) >= 18 &&
            parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) <= 29) {
            eighteenTo29++
          } else if (parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) >= 30 &&
            parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) <= 41) {
            thirtyTo41++
          } else if (parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) >= 42 &&
            parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) <= 53) {
            forty2To53++
          }
          if (parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) >= 54 &&
            parseInt(moment().format('YYYY') - moment(beneficiaries[i].dob).format('YYYY')) <= 65) {
            fifty4To65++
          } else {
            sixty6Up++
          }
        }

        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary By Age Group Retrieved.', {
          eighteenTo29,
          thirtyTo41,
          forty2To53,
          fifty4To65,
          sixty6Up
        });
        return Response.send(res);
      }
<<<<<<< HEAD
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Age Group Retrieved.', {eighteenTo29, thirtyTo41, forty2To53, fifty4To65, sixty6Up});
=======

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Age Group Retrieved.');
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      return Response.send(res);



    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
      return Response.send(res);
    }
  }

  static async beneficiariesByMaritalStatus(req, res) {

    try {

      let married = 0
      let single = 0
      let divorce = 0

      const beneficiaries = await BeneficiaryService.getBeneficiaries();

      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {

          if (beneficiaries[i].marital_status == 'single') {
            single++
          } else if (beneficiaries[i].marital_status == 'married') {
            married++
          } else if (beneficiaries[i].marital_status == 'divorce') {
            divorce++
          }
        }

        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary By Marital Status Retrieved.', {
          single,
          married,
          divorce
        });
        return Response.send(res);
      }
<<<<<<< HEAD
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Marital Status Retrieved.',{single, married, divorce});
=======

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Marital Status Retrieved.');
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      return Response.send(res);

    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
      return Response.send(res);
    }
  }

  static async beneficiariesByLocation(req, res) {

    try {

      let locations = []

      const beneficiaries = await BeneficiaryService.getBeneficiaries();
<<<<<<< HEAD
      
      if(beneficiaries.length > 0){
       
        const beneficiary = beneficiaries.map(bene =>  bene.location )
        let arr =    beneficiary.filter(x => x !== null)

       let repeated = 1
       
       let val;
        for(let i = 0; i<arr.length; i++){
        val = JSON.parse(arr[i])
          if(locations.length >= 0 && !locations.some(coun => coun.country === val.state)) {
            locations.push({country: val.state, repeated})
          }else if(locations.length > 0 && locations.some(coun => coun.country === val.state)){
            locations.find((obj => obj.country === val.state)).repeated += 1 
=======

      if (beneficiaries.length > 0) {

        const beneficiary = beneficiaries.map(bene => bene.location)
        let arr = beneficiary.filter(x => x !== null)

        let repeated = 1

        let val;
        for (let i = 0; i < arr.length; i++) {
          val = JSON.parse(arr[i])
          console.log(val.country)
          if (locations.length >= 0 && !locations.some(coun => coun.country === val.country)) {
            locations.push({
              country: val.country,
              repeated
            })
          } else if (locations.length > 0 && locations.some(coun => coun.country === val.country)) {
            locations.find((obj => obj.country === val.country)).repeated += 1
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
          }

        }



        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary By Location Retrieved.', locations);
        return Response.send(res);
      }
<<<<<<< HEAD
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Location Retrieved.', locations);
=======

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Beneficiary By Location Retrieved.');
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      return Response.send(res);


    } catch (error) {
      console.log(error);
<<<<<<< HEAD
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
=======
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.' + error);
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      return Response.send(res);
    }
  }

  static async beneficiariesTotalBalance(req, res) {
    try {
      let beneficiary;
      let balance;
      let balances = []
      let repeated = 1
      const beneficiaries = await BeneficiaryService.getBeneficiariesTotalAmount();
      if (beneficiaries.length <= 0) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Transaction Found.');
        return Response.send(res);
<<<<<<< HEAD
      }
      else{
        beneficiary = Array.isArray(beneficiaries) ? beneficiaries.map((user)=> user.Wallet) : []
       
       balance = Array.isArray(beneficiary) ? beneficiary.map((wallet) => wallet) : []
       var newArray = balance.filter(value => Object.keys(value).length !== 0);
       var myNewArray = [].concat.apply([], newArray);
        
      //  for(let i = 0; i<myNewArray.length; i++){

      //   if(balances.length >= 0 && ! balances.some(bal => bal.balance === myNewArray[i].balance)) {
      //     balances.push({balance: myNewArray[i].balance, repeated})
      //   }else if(balances.length > 0 && balances.some(bal => bal.balance === myNewArray[i].balance)){
      //     balances.find((obj => obj.balance === (myNewArray[i]).balance)).repeated += 1;

      //   }
        
      //  }
        const bal = myNewArray.map(({balance}) => balance)
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary Total Balance Retrieved.',bal);
      return Response.send(res);
=======
      } else {
        beneficiary = Array.isArray(beneficiaries) ? beneficiaries.map((user) => user.Wallet) : []

        balance = Array.isArray(beneficiary) ? beneficiary.map((wallet) => wallet) : []
        var newArray = balance.filter(value => Object.keys(value).length !== 0);
        var myNewArray = [].concat.apply([], newArray);

        for (let i = 0; i < myNewArray.length; i++) {

          if (balances.length >= 0 && !balances.some(bal => bal.balance === myNewArray[i].balance)) {
            balances.push({
              balance: myNewArray[i].balance,
              repeated
            })
          } else if (balances.length > 0 && balances.some(bal => bal.balance === myNewArray[i].balance)) {
            balances.find((obj => obj.balance === (myNewArray[i]).balance)).repeated += 1;
          }
        }

        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary Total Balance Retrieved.', balances);
        return Response.send(res);
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      }
    } catch (error) {
      console.log(error);
<<<<<<< HEAD
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
=======
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.' + error);
>>>>>>> 78a258fc06c488fdd4457c68fe9257abe05f607c
      return Response.send(res);
    }
  }

}

module.exports = BeneficiariesController;