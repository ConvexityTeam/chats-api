const {Sequelize, Op} = require('sequelize');
const {User, ImpactReports, Campaign} = require('../models');

class ImpactReportService {
  static async create(reports) {
    try {
      return await ImpactReports.create(reports);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  static async get(id) {
    return await ImpactReports.findByPk(id);
  }
  static async getReportByCampaignId(campaignId) {
    return ImpactReports.findAll({
      where: {
        campaign_id: campaignId
      }
    });
  }
  static async getAll() {
    return await ImpactReports.findAll();
  }
  static async delete(id) {}
  static async update(report) {}
}
module.exports = ImpactReportService;
