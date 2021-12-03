const {
  Response
} = require("../libs");
const {
  HttpStatusCode,
  generateOrderRef,
  generateQrcodeURL
} = require("../utils");
const { VendorService, WalletService, OrderService } = require('../services');
class OrderController {
  static  async getOrderByReference(req, res){
    try {
      const reference = req.params.reference;
      const order = await VendorService.getOrder({reference});
      if(order) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', order);
        return Response.send(res);
      }

      Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Order not found.');
      return Response.send(res)
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }

  static async completeOrder(req, res) {
    try {
      const reference = req.params.reference;
      const data = await VendorService.getOrder({reference});
      if(!data) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Order not found.');
        return Response.send(res)
      }

      if(data.order.status !== 'pending') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Order ${data.order.status}`);
        return Response.send(res)
      }

      const wallet = await WalletService.findUserCampaignWallet(req.user.id, data.order.CampaignId);

      if(!wallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Account not eligible to pay for order');
        return Response.send(res)
      }

      if(wallet.balance < data.total_cost) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Insufficient campaign wallet balance.');
        return Response.send(res)
      }

      const transaction = await OrderService.processOrder(wallet, data.order, data.order.Vendor, data.total_cost);

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', transaction );
      return Response.send(res);
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }
}

module.exports = OrderController;