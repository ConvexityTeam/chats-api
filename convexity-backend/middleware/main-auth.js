const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.SECRET_KEY, (err, value) => {
      if (err) {
        res.status(401).json({ error: 'Unauthorised. Token Invalid' })
      } else {
        req.user = value.user
        next()
      }
    })
  } catch (error) {
    res.status(401).json({
      error: error,
    });
  }
};
