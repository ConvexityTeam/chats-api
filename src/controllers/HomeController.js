const db = require('../models');
const util = require('../libs/Utils');

class AuthController {
  constructor() {
    this.emails = [];
  }

  static async dashboard(req, res) {
    try {
      const { id } = req.params;

      if (!Number(id)) {
        throw new Error('Invalid Users Id');
      }
      db.User.findOne({ where: { id } })
        .then((user) => {
          util.setSuccess(200, user);
          return util.send(res);
        })
        .catch((error) => {
          throw new Error(500, `Internal Server Error ${error}`);
        });
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
    return null;
  }

  static async generateOtp(res) {
    util.setError(500);
    return util.send(res);
  }
}
// static async getAVendor(req, res) {
//     const { id } = req.params;

//     // if (!Number(id)) {
//     //     util.setError(400, 'Please input a valid numeric value');
//     //     return util.send(res);
//     // }

//     try {
//         const aVendor = await VendorServices.getAVendor(id);

//         if (!aVendor) {
//             util.setError(404, `Cannot find Vendor with the id ${id}`);
//         } else {
//             util.setSuccess(200, 'Vendors Record Found', aVendor);
//         }
//         return util.send(res);
//     } catch (error) {
//         util.setError(404, error);
//         return util.send(res);
//     }
// }

module.exports = AuthController;
