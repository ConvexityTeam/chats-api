const { CampaignImpactReport, ImpactReports } = require('../models');

class ImpactReportService {
  static async create(reports) {
    try {
      return await CampaignImpactReport.create(reports);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  static async get(id) {
    const response = await ImpactReports.findByPk(id);
    return response;
  }

  static async getReportByCampaignId(campaignId) {
    return CampaignImpactReport.findAll({
      where: {
        CampaignId: campaignId,
      },
    });
  }

  static async getAll() {
    const response = await CampaignImpactReport.findAll();
    return response;
  }
}
module.exports = ImpactReportService;
