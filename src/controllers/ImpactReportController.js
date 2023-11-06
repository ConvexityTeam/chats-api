require('dotenv').config();
const {Response} = require('../libs');
const {HttpStatusCode} = require('../utils');
const Validator = require('validatorjs');
const {
  ImpactReportService,
  CampaignService,
  UserService
} = require('../services');

class ImpactReportController {
  static async createReport(req, res) {
    const data = req.body;

    try {
      const rules = {
        title: 'string',
        AgentId: 'integer|string',
        CampaignId: 'integer|string',
        MediaLink: 'required'
      };
      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, validation.errors);
        return Response.send(res);
      }

      const [campaignUnique, user] = await Promise.all([
        CampaignService.getCampaignByUUID(data.CampaignId),
        UserService.getUserByUUID(data.AgentId)
      ]);

      const payload = {
        title: data.title,
        AgentId: user.id,
        CampaignId: campaignUnique.id,
        MediaLink: data.MediaLink
      };

      const report = await ImpactReportService.create(payload);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Report Generated successfully',
        report
      );
      return Response.send(res);
    } catch (error) {
      console.error(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error, Contact Support'
      );
      return Response.send(res);
    }
  }
  static async getAllReport(req, res) {
    try {
      const reports = await ImpactReportService.getAll();
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Reports fetched successfully',
        reports
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
  static async getReportByCampaignId(req, res) {
    const campaignId = req.params.campaignId;
    try {
      if (!campaignId) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Please input a valid CampaignId'
        );
        return Response.send(res);
      }
      const campaign = await CampaignService.getCampaignByUUID(campaignId);
      const report = await ImpactReportService.getById(campaign.id);
      //   await db.ImpactReports.findAll({
      //   where: {
      //     CampaignId: campaignId
      //   }
      // });
      //
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Report fetched successfully',
        report
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
  //   static async updateReport(req, res) {}
}

module.exports = ImpactReportController;
