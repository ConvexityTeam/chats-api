const {
  Response
} = require("../libs");
const {
  HttpStatusCode,
  generateOrderRef,
  generateQrcodeURL
} = require("../utils");
const { VendorService } = require('../services');
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

  static async completeOrder(req, res) {}
}

module.exports = OrderController;