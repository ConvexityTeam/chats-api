const { Wallet } = require('../models')
class WalletService {
  static updateOrCreate({ wallet_type, CampaignId, ownerId }, data) {
    const where = { wallet_type };
    if (wallet_type == 'user') {
      where.UserId = ownerId;
    }
    if (wallet_type == 'organisation') {
      where.OrganisationId = ownerId;
    }
    if (CampaignId) {
      where.CampaignId = CampaignId;
    }

    return Wallet.findOne({where})
      .then(async wallet => {
        if(wallet) {
          await wallet.update(data);
          return Wallet.findOne({where});
        }
        return Wallet.create({...where, ...data});
      });
  }
}

module.exports = WalletService;