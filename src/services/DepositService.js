const { FundAccount } = require('../models')

class DepositService {

  static findOrgDeposits(OrganisationId, extraClause = null) {
    return FundAccount.findAll({
      where: {
        OrganisationId,
        ...extraClause
      }
    });
  }

  static findOrgDepositByRef(OrganisationId, transactionReference) {
    return FundAccount.findOne({
      where: {
        OrganisationId,
        transactionReference
      }
    });
  }

}

module.exports = DepositService