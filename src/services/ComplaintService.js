const {userConst} = require('../constants');
const {User, Complaint} = require('../models');
const Pagination = require('../utils/pagination');

class ComplaintService {
  static createComplaint(complaint) {
    return Complaint.create(complaint);
  }

  static getComplaint(uuid) {
    return Complaint.findOne({
      where: {uuid},
      include: [
        'Campaign',
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
  }

  static async getCampaignComplaints(CampaignId, extraClause = null) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }
    const complaint = await Complaint.findAndCountAll({
      order: [['createdAt', 'DESC']],
      distinct: true,
      ...queryOptions,
      where: {...extraClause, CampaignId},
      include: [
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
    return await Pagination.getPagingData(complaint, page, limit);
  }

  static getBeneficiaryComplaints(UserId, extraClause = null, include = []) {
    return Complaint.findAndCountAll({
      where: {...extraClause, UserId},
      include
    });
  }

  static updateComplaint(uuid, update) {
    return Complaint.update(update, {where: {uuid}});
  }
}

module.exports = ComplaintService;
