const jwt = require("jsonwebtoken");
const util = require("../libs/Utils");
require("dotenv").config();

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, process.env.SECRET_KEY, (err, value) => {
      if (err) {
        util.setError(401, "Unauthorised. Token Invalid");
        return util.send(res);
      } else {
        req.user = value.user;
        next();
      }
    });
  } catch (error) {
    util.setError(401, error.message);
    return util.send(res);
  }
};
