require('dotenv').config();
const db = require('../models');
const {util, Response, Logger} = require('../libs');
const {HttpStatusCode} = require('../utils');
const Validator = require('validatorjs');
const uploadFile = require('./AmazonController');
const {ImpactReportService} = require('../services/ImpactReportService');
const {SanitizeObject} = require('../utils');
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';
const {termiiConfig} = require('../config');
const {async} = require('regenerator-runtime');
const {AclRoles} = require('../utils');

class ImpactReportController {
  static async createReport(req, res) {
    const data = req.body;

    try {
      const rules = {
        title: 'string',
        AgentId: 'integer|required',
        CampaignId: 'integer|required',
        MediaLink: 'required'
      };
      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, validation.errors);
        return Response.send(res);
      }
      const payload = {
        title: data.title,
        AgentId: data.AgentId,
        CampaignId: data.CampaignId,
        MediaLink: data.MediaLink
      };
      const report = await db.ImpactReports.create(payload); //await ImpactReportService.create(payload);
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
      const reports = await db.ImpactReports.findAll(); //ImpactReportService.getAll();
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
      if (!Number(campaignId)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Please input a valid CampaignId'
        );
        return Response.send(res);
      }
      const report = await db.ImpactReports.findAll({
        where: {
          CampaignId: campaignId
        }
      }); //ImpactReportService.getById(campaignId);
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
