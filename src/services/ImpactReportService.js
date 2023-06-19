const {Sequelize, Op} = require('sequelize');
const {User, ImpactReports, Campaign} = require('../models');

class ImpactReportService {
  static create(reports) {
    try {
      return ImpactReports.create(reports);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  static async get(id) {
    return ImpactReports.findByPk(id);
  }
  static async getReportByCampaignId(campaignId) {
    return ImpactReports.findAll({
      where: {
        campaign_id: campaignId
      }
    });
  }
  static async getAll() {
    return ImpactReports.findAll();
  }
  static async delete(id) {}
  static async update(report) {}
}
module.exports = ImpactReportService;
