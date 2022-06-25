const db = require("../models");
const {util, Response} = require("../libs");
const {
  HttpStatusCode,
} = require("../utils");
const Validator = require("validatorjs");
const uploadFile = require("./AmazonController");
const { UserService, OrganisationService } = require("../services");
const environ = process.env.NODE_ENV == "development" ? "d" : "p";

class AdminController {
  static async updateUserStatus(req, res) {
    const data = req.body;
    const rules = {
      userId: "required|numeric",
      status: "required|string|in:activated,suspended,pending",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const userExist = await db.User.findOne({ where: { id: data.userId } });
      if (userExist) {
        await userExist.update({ status: data.status }).then((response) => {
          util.setError(200, "User Updated");
          return util.send(res);
        });
      } else {
        util.setError(404, "Invalid User Id", error);
        return util.send(res);
      }
    }
  }

  static async updateCampaignStatus(req, res) {
    const data = req.body;
    const rules = {
      campaignId: "required|numeric",
      status: "required|string|in:in-progress,paused,pending",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: { id: data.campaignId },
      });
      if (campaignExist) {
        await campaignExist.update({ status: data.status }).then((response) => {
          util.setError(200, "Campaign Status Updated");
          return util.send(res);
        });
      } else {
        util.setError(404, "Invalid Campaign Id", error);
        return util.send(res);
      }
    }
  }

static async verifyAccount (req, res){
  try{
    const {userprofile_id} =req.params
    const data = req.body;
    data.country = 'Nigeria'
    data.currency = 'NGN'
    const rules = {
      first_name: "required|string",
      last_name: "required|string",
      nin_image_url: "required|url",
      gender: "required|in:male,female",
      address: "string",
      location: "string",
      dob: "string",
      phone: ['required','regex:/^([0|\+[0-9]{1,5})?([7-9][0-9]{9})$/'],
      nin: "required|digits_between:10,11",
      marital_status: "string"
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    }
    if(!req.file){
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Upload Selfie`)
      return Response.send(res)
    }
    const organisation = await OrganisationService.findOneById(userprofile_id)
    if(!organisation){
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Organisation Not Found`)
      return Response.send(res)
    }

    // const  extension = req.file.mimetype.split('/').pop();

    // const profile_pic =  await uploadFile(
    //     req.file,
    //     "u-" + environ + "-" + organisation.email + "-i." + extension,
    //     "convexity-profile-images"
    //   )

    await db.User.update({
      profile_pic: data.nin_image_url,
      ...data,
      status: 'activated',
      is_nin_verified: true
    },{where: {id: organisation.id}})

    Response.setSuccess(HttpStatusCode.STATUS_OK, `NIN Verified`, organisation)
    return Response.send(res)

  }catch(error){
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, `Internal Server Error Try Again: ${error}`)
      return Response.send(res)
  }
} 
  
}

module.exports = AdminController;
