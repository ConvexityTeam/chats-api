const {
  PaystackService,
  DepositService,
  WalletService,
  QueueService,
  TransactionService,
  CampaignService,
} = require('../services');
const {Logger, Response} = require('../libs');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const {Op} = require('sequelize');
const { logger } = require('../libs/Logger');
class WalletController {
  static async getOrgnaisationTransaction(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const reference = req.params.reference;
      if (!reference) {
        const transactions = await TransactionService.findOrgnaisationTransactions(
          OrganisationId,
        );
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Organisation Transactions',
          transactions,
        );
        return Response.send(res);
      }

      const transaction = await TransactionService.findTransaction({
        OrganisationId,
        reference,
      });
      if (!transaction) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Transaction not found.',
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Transaction Details',
        transaction,
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.',
      );
      return Response.send(res);
    }
  }
  static async getOrganisationWallet(req, res) {
    try {
      const loger = Logger;
      const OrganisationId = req.organisation.id;
      const uuid = req.params.wallet_id;
      if (uuid) {
        return WalletController._handleSingleWallet(res, {
          OrganisationId,
          uuid,
        });
      }

      let {
        total: total_deposit,
      } = await TransactionService.getTotalTransactionAmount({
        OrganisationId,
        status: 'success',
        transaction_type: 'deposit',
      });

      let {
        total: spend_for_campaign,
      } = await TransactionService.getTotalTransactionAmount({
        OrganisationId,
        status: 'success',
        transaction_type: 'transfer',
        CampaignId: {
          [Op.not]: null,
        },
      });

      const wallet = await WalletService.findMainOrganisationWallet(
        OrganisationId,
      );
      if (!wallet) {
        QueueService.createWallet(OrganisationId, 'organisation');
      }

      const MainWallet = wallet.toObject();
      total_deposit = total_deposit || 0;
      spend_for_campaign = spend_for_campaign || 0;

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Main wallet deatils', {
        MainWallet,
        total_deposit,
        spend_for_campaign,
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.',
      );
      return Response.send(res);
    }
  }

  static async getOrganisationCampaignWallet(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      const OrganisationId = req.organisation.id;

      if (CampaignId) {
        const wallet = await WalletService.findCampaignFundWallet(
          OrganisationId,
          CampaignId,
        );
        if (!wallet) {
          Response.setError(
            HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
            'Campaign wallet not found.',
          );
        } else {
          Response.setSuccess(
            HttpStatusCode.STATUS_OK,
            'Campaign Wallet',
            wallet.toObject(),
          );
        }
        return Response.send(res);
      }

      const wallets = await WalletService.findOrganisationCampaignWallets(
        OrganisationId,
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign wallets',
        wallets,
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.',
      );
      return Response.send(res);
    }
  }

  static async paystackDeposit(req, res) {
    try {
      const data = SanitizeObject(req.body, ['amount', 'currency']);
      const {organisation_id} = req.params;
      if (!data.currency) data.currency = 'NGN';
      const organisation = req.organisation;
      organisation.dataValues.email = req.user.email;
      const wallet = await WalletService.findMainOrganisationWallet(
        organisation_id,
      );
      if (!wallet) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Oganisation wallet not found.',
        );
      }
      logger.info(`Initiating PayStack Transaction`)
      const response = await PaystackService.buildDepositData(
        organisation,
        data.amount,
        data.currency,
      );
        logger.info(`Initiated PayStack Transaction`)
      //QueueService.createPayStack(wallet.address, data.amount)
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Deposit data generated.',
        response,
      );
      return Response.send(res);
    } catch (error) {
      logger.error(`Error Initiating PayStack Transaction: ${error}`)
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please retry.',
      );
      return Response.send(res);
    }
  }

  static async depositRecords(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const filter = SanitizeObject(req.query, [
        'channel',
        'service',
        'status',
        'approved',
      ]);
      const records = await DepositService.findOrgDeposits(
        OrganisationId,
        filter,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Deposit history.',
        records,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.',
      );
      return Response.send(res);
    }
  }

  static async depositByReference(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const reference = req.params.reference;
      const record = await DepositService.findOrgDepositByRef(
        OrganisationId,
        reference,
      );
      !record &&
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Deposit record not found.',
        );
      !!record &&
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Deposit record found.',
          record,
        );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.',
      );
      return Response.send(res);
    }
  }

  static async CampaignBalance(req, res) {
    const {campaign_id, organisation_id} = req.params;
    console.log(campaign_id, organisation_id, 'campaign_id, organisation_id');
    try {
      const campaign = await CampaignService.getCampaignWallet(
        campaign_id,
        organisation_id,
      );
      if (campaign) {
        //const balance = campaign.Wallet.balance
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Balance Retrieved .',
          campaign,
        );
        return Response.send(res);
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `No Campaign with ID: ${campaign_id}`,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.' + error,
      );
      return Response.send(res);
    }
  }

  static async CampaignBalance(req, res) {
    const {campaign_id, organisation_id} = req.params;

    try {
      const campaign = await WalletService.findUserWallets(
        campaign_id,
        organisation_id,
      );
      if (campaign) {
        const balance = campaign.Wallet.balance;
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Balance Retrieved .',
          balance,
        );
        return Response.send(res);
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `No Campaign with ID: ${campaign_id}`,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.' + error,
      );
      return Response.send(res);
    }
  }

  static async _handleSingleWallet(res, query) {
    const wallet = await WalletService.findSingleWallet(query);
    if (!wallet) {
      Response.setError(
        HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
        'Wallet not found',
      );
    } else {
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Wallet details',
        wallet.toObject(),
      );
    }
    return Response.send(res);
  }
}

module.exports = WalletController;
