const {Sequelize, Op} = require('sequelize');
const {User, ImpactReport, Campaign} = require('../models');

class ImpactReportService {
  static async create(reports) {
    return ImpactReport.create(reports);
  }
  static async get(id) {
    return ImpactReport.findByPk(id);
  }
  static async getReportByCampaignId(campaignId) {
    return ImpactReport.findAll({
      where: {
        campaign_id: campaignId
      }
    });
  }
  static async getAll() {
    return ImpactReport.findAll();
  }
  static async delete(id) {}
  static async update(report) {}
}
module.exports = ImpactReportService;
