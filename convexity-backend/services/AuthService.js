const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

class AuthService {
  static async login(data, _password, roleId = null) {
    const error = new Error();
    return new Promise(function(resolve, reject) {
      if(data) {
        const {password, tfa_secret, ...user} = data.toJSON();
        if(bcrypt.compareSync(_password, password)) {
          if(user.status == "suspended") {
            error.status = 401;
            error.message = 'Account Suspended. Contact Support.';
            reject(error);
            return;
          }

          if(roleId && user.RoleId != roleId) {
            error.status = 401;
            error.message = 'Unathorized access.';
            reject(error);
            return;
          }
          const uid = user.id;
          const oids = user.AssociatedOrganisations.map(assoc => assoc.OrganisationId);
          const token = jwt.sign({uid, oids}, process.env.SECRET_KEY, { expiresIn: "48hr", });
          resolve({user, token})
        }

        error.status = 401;
        error.message = 'Invalid login credentials';
        reject(error);
      } else {
        error.status = 401;
        error.message = 'Invalid login credentials';
        reject(error);
      }
    })
  }
}

module.exports = AuthService;