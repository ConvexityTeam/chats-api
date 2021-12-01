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
  async getOrderByReference(req, res){
    try {
      const reference = req.params.order_reference;
      const order = await VendorService.getOrder({reference});
      if(order) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', order);
        return Response.send(res);
      }

      Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Order not found.');
      return Response.send(res)
    } catch (error) {
      coonosle.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }

  async completeOrder(req, res) {}
}

module.exports = OrderController;