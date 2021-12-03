const { walletConst } = require('../constants');
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

  static findMainOrganisationWallet(OrganisationId) {
    return Wallet.findOne({where: {
      OrganisationId,
      wallet_type: 'organisation',
      CampaignId: null
    }});
  }

  static findUserWallets(UserId) {
    return Wallet.findAll({
      where: {UserId},
      attributes: {
        exclude: walletConst.walletExcludes
      },
      include: ['Campaign']
    });
  }

  static findUserCampaignWallet(UserId, CampaignId) {
    return Wallet.findOne({
      where: {UserId, CampaignId},
      include: ['Campaign']
    });
  }
}

module.exports = WalletService;